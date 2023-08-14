import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import prisma from '../../../../lib/prisma'

// GET /api/sconfig/haproxy/:id
// Download config file for haproxy for this server 
export default async function handle(req: any, res: any) {

	// disable login for now (no sensitive info here anyway)
	const session = await getServerSession(req, res, authOptions)
	if (session) {
		// Signed in
		console.log("Session", JSON.stringify(session, null, 2))
	} else {
		// Not Signed in
		res.status(404).json({ "error": "not signed in" })
		res.end()
		return
	}

	if (session == null || session.user?.name == null) {
		res.status(404).json({ "error": "not signed in" })
		res.end()
		return
	}

	const myUser = await prisma.user.findFirst({ where: { pubkey: session.user.name } })

	if (!myUser) {
		res.status(404).json({ "error": "user not found" })
		res.end()
		return
	}

	let haproxyStatsUser = "haproxy"
	let haproxyStatsPass = "haproxy"

	if (process.env.HAPROXY_STATS_USER) {
		haproxyStatsUser = process.env.HAPROXY_STATS_USER
	}
	if (process.env.HAPROXY_STATS_PASS) {
		haproxyStatsPass = process.env.HAPROXY_STATS_PASS
	}

	if (!process.env.DEPLOY_PUBKEY) {
		console.log("ERROR: no DEPLOY_PUBKEY environment, unauthorized")
		res.status(404).json({ "error": "missing DEPLOY_PUBKEY unauthorized" })
		res.end()
		return
	} else {
		if (myUser.pubkey != process.env.DEPLOY_PUBKEY) {
			res.status(404).json({ "error": "unauthorized" })
			res.end()
			return
		}
	}

	// load the following from prisma:
	// the hostnames that haproxy serves on this machine
	// the backends with port# for strfry backends
	// the certificates locations
	// default domain
	let usethisdomain = "nostr1.com"
	if (process.env.CREATOR_DOMAIN) {
		usethisdomain = process.env.CREATOR_DOMAIN
	}

	let pemName = "nostr1.pem"
	if (process.env.HAPROXY_PEM) {
		pemName = process.env.HAPROXY_PEM
	}

	const fetchDomain = await prisma.relay.findMany({
		where: {
			domain: usethisdomain,
			OR: [{ status: "provision" }, { status: "running" }]
		},
	})

	console.log(fetchDomain)

	// top level
	let haproxy_subdomains_cfg = `
		acl host_ws hdr_beg(Host) -i ws.
		acl hdr_connection_upgrade hdr(Connection)  -i upgrade
		acl hdr_upgrade_websocket  hdr(Upgrade)     -i websocket
	
	`

	let haproxy_backends_cfg = ``

	// each domain
	fetchDomain.forEach((element, counter) => {
		haproxy_subdomains_cfg = haproxy_subdomains_cfg + `
		acl ${element.name} hdr(host) -i ${element.name}.${element.domain}
		use_backend ${element.name} if ${element.name}
		use_backend ${element.name} if host_ws ${element.name}
		use_backend ${element.name} if hdr_connection_upgrade hdr_upgrade_websocket ${element.name} 
		`

		haproxy_backends_cfg = haproxy_backends_cfg + `
backend ${element.name}
	mode  		        http
	option 		        redispatch
	balance 	        source
	option forwardfor except 127.0.0.1 header x-real-ip
	server     websocket-001 127.0.0.1:${element.port} maxconn 50000 weight 10 check
	`

	})

	const haproxy_cfg = `
global
	log /dev/log	local0
	log /dev/log	local1 notice
	#chroot /usr/local/var/lib/haproxy
	stats socket /tmp/admin.sock mode 660 level admin
	stats timeout 30s
	user haproxy
	group haproxy
	daemon
	# Default SSL material locations
	ca-base /etc/ssl/certs
	crt-base /etc/ssl/private
	# See: https://ssl-config.mozilla.org/#server=haproxy&server-version=2.0.3&config=intermediate
	ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384
	ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
	ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
	log	global
	mode	http
	option	httplog
	option	dontlognull
        timeout connect 5s
        timeout client  25s
        timeout server  25s
	timeout tunnel 3600s
	#timeout http-keep-alive 1s
	#timeout http-request 15s
	#timeout queue 30s
	#timeout tarpit 60s
	errorfile 400 /etc/haproxy/errors/400.http
	errorfile 403 /etc/haproxy/errors/403.http
	errorfile 408 /etc/haproxy/errors/408.http
	errorfile 500 /etc/haproxy/errors/500.http
	errorfile 502 /etc/haproxy/errors/502.http
	errorfile 503 /etc/haproxy/errors/503.http
	errorfile 504 /etc/haproxy/errors/504.http

frontend unsecured
	maxconn 10000
	bind 0.0.0.0:80 name http
	mode 		        http
	timeout 		client 86400000
	redirect 		prefix https://${usethisdomain} code 301 

frontend secured
	bind			0.0.0.0:443 ssl crt /etc/haproxy/certs/${pemName} crt /etc/haproxy/certs/relay.tools.pem
	mode			http
	timeout			client   3600s
	backlog			4096
	maxconn			60000      
	default_backend		main	
	http-request del-header x-real-ip
	option forwardfor except 127.0.0.1 header x-real-ip

	http-request return content-type image/x-icon file /etc/haproxy/static/favicon.ico if { path /favicon.ico }
	http-request return content-type image/png file /etc/haproxy/static/favicon-32x32.png if { path /favicon-32x32.png }
	http-request return content-type image/png file /etc/haproxy/static/favicon-16x16.png if { path /favicon-16x16.png }
	http-request return content-type image/png file /etc/haproxy/static/apple-touch-icon.png if { path /apple-touch-icon.png }
	http-request return content-type application/json file /etc/haproxy/static/apple-touch-icon.png if { path /site.webmanifest }

	${haproxy_subdomains_cfg}

backend main
	mode  		        http
	option 		        redispatch
	balance 	        source
	option forwardfor except 127.0.0.1 header x-real-ip
	server     main-001 127.0.0.1:3000 maxconn 50000 weight 10 check

	${haproxy_backends_cfg}

listen stats
	bind 0.0.0.0:8888 ssl crt  /etc/haproxy/certs/${pemName}
        mode            	http
        stats           	enable
        option          	httplog
        stats           	show-legends
        stats          		uri /haproxy
        stats           	realm Haproxy\ Statistics
        stats           	refresh 5s
        stats           	auth ${haproxyStatsUser}:${haproxyStatsPass}
        timeout         	connect 5000ms
        timeout         	client 50000ms
        timeout         	server 50000ms

backend backend_static_index
	mode http
	http-request set-log-level silent
	errorfile 503 /etc/haproxy/static/index.static.html
`

	res.statusCode = 200;
	res.setHeader('Content-Type', 'application/octet-stream');
	res.setHeader('Content-disposition', 'filename="haproxy.cfg"');
	res.end(haproxy_cfg);
}