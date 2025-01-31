import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import prisma from '../../../../lib/prisma'
import { use } from "react"

// GET /api/sconfig/haproxy/:id
// Download config file for haproxy for this server 
export default async function handle(req: any, res: any) {

	// disable login for now (no sensitive info here anyway)
	const session = await getServerSession(req, res, authOptions)

	if (!session) {
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

    // interceptor port number
    let interceptorPort = 9696
    if (process.env.INTERCEPTOR_PORT) {
        interceptorPort = parseInt(process.env.INTERCEPTOR_PORT)
    }

    const fetchServers = await prisma.server.findMany()

    let useInterceptors = []
    if(fetchServers && fetchServers.length > 0) {
        for (let i = 0; i < fetchServers.length; i++) {
            useInterceptors.push(fetchServers[i].ip)
        }
    } else {
        useInterceptors = ["127.0.0.1"]
    }

    let useApps = []
    if(fetchServers && fetchServers.length > 0) {
        for (let i = 0; i < fetchServers.length; i++) {
            useApps.push(fetchServers[i].ip)
        }
    } else {
        useApps = ["127.0.0.1"]
    }

    // two app servers per server
    let app_servers_cfg = ``
    for(let i = 0; i < useApps.length; i++) {
        app_servers_cfg = app_servers_cfg + `
    server     app-${i} ${useApps[i]}:3000 maxconn 50000 weight 10 check
    server    app-${i}-1 ${useApps[i]}:3001 maxconn 50000 weight 10 check`
    }


	// load the following from prisma:
	// the hostnames that haproxy serves on this machine
	// the backends with port# for strfry backends
	// the certificates locations
	// default domain
	let usethisdomain = "nostr1.com"
	if (process.env.NEXT_PUBLIC_CREATOR_DOMAIN) {
		usethisdomain = process.env.NEXT_PUBLIC_CREATOR_DOMAIN
	}

    let usethisrootdomain = usethisdomain
    if (process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
        usethisrootdomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
        usethisrootdomain = usethisrootdomain.replace("https://", "")
    }

    // preview domain for testing out new frontends alongside production
    let previewFrontend = ""
    let previewBackend = ""
    if (process.env.NEXT_PUBLIC_PREVIEW_DOMAIN && process.env.NEXT_PUBLIC_PREVIEW_PORT) {
        previewFrontend = `acl host_preview hdr_beg(Host) -i ${process.env.NEXT_PUBLIC_PREVIEW_DOMAIN}
        use_backend preview if host_preview
        `

        previewBackend = `
        backend preview 
            mode  		        http
            option 		        redispatch
            balance 	        roundrobin
            option forwardfor except 127.0.0.1 header x-real-ip
            server     websocket-001 127.0.0.1:${process.env.NEXT_PUBLIC_PREVIEW_PORT} maxconn 50000 weight 10 check 
        `
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

	// external domains
	const fetchExternalDomain = await prisma.relay.findMany({
		// where external == true
		where: {
			is_external: true,
			status: "running"
		}
	})

    const fetchDeletedDomains = await prisma.relay.findMany({
        where: {
            domain: usethisdomain,
            status: "deleted"
        }
    })

    const fetchPausedDomains = await prisma.relay.findMany({
        where: {
            domain: usethisdomain,
            status: "paused"
        }
    })

	// top level
	let haproxy_subdomains_cfg = `
		acl host_ws hdr_beg(Host) -i ws.
		acl hdr_connection_upgrade hdr(Connection)  -i upgrade
		acl hdr_upgrade_websocket  hdr(Upgrade)     -i websocket
	
	`

	let haproxy_backends_cfg = ``

	// each domain
	fetchDomain.forEach((element, counter) => {
        let usePort = element.port
        if(element.auth_required) {
            usePort = interceptorPort
        }
        let useIP = "127.0.0.1"
        if(element.ip) {
            useIP = element.ip
        }
		haproxy_subdomains_cfg = haproxy_subdomains_cfg + `
		acl ${element.name + "_root"} path_beg -i /
		acl ${element.name} hdr(Host) -i ${element.name}.${element.domain}
		acl ${element.name + "_nostrjson"} req.hdr(Accept) -i application/nostr+json
		use_backend ${element.name} if host_ws ${element.name}
		use_backend ${element.name} if hdr_connection_upgrade hdr_upgrade_websocket ${element.name} 
		http-request set-path /api/relay/${element.id}/nostrjson if ${element.name} ${element.name + "_root"} ${element.name + "_nostrjson"}
		`

		haproxy_backends_cfg = haproxy_backends_cfg + `
backend ${element.name}
	mode  		        http
	option 		        redispatch
	balance 	        roundrobin
	option forwardfor except 127.0.0.1 header x-real-ip`

    if(element.auth_required) {
        for(let i = 0; i < useInterceptors.length; i++) {
            haproxy_backends_cfg = haproxy_backends_cfg + `
    server     interceptor-${i} ${useInterceptors[i]}:${interceptorPort} maxconn 50000 weight 10 check`
        }

    } else {
	    haproxy_backends_cfg = haproxy_backends_cfg + `
    server     websocket-001 ${useIP}:${usePort} maxconn 50000 weight 10 check`

    }

	})

	// each externally hosted domain
	fetchExternalDomain.forEach((element, counter) => {

		// for now, detect if the upstream is SSL, and don't verify the cert
		let useSSLVerify = ""
		if(element.port == 443) {
			useSSLVerify = "ssl verify none"
		}

		haproxy_subdomains_cfg = haproxy_subdomains_cfg + `
		acl ${element.name + "_root"} path_beg -i /
		acl ${element.name} hdr(Host) -i ${element.domain}
		acl ${element.name + "_nostrjson"} req.hdr(Accept) -i application/nostr+json
		use_backend ${element.name} if host_ws ${element.name}
		use_backend ${element.name} if hdr_connection_upgrade hdr_upgrade_websocket ${element.name} 
		http-request set-path /api/relay/${element.id}/nostrjson if ${element.name} ${element.name + "_root"} ${element.name + "_nostrjson"}
		`

		haproxy_backends_cfg = haproxy_backends_cfg + `
backend ${element.name}
	mode  		        http
	option 		        redispatch
	balance 	        roundrobin
	option forwardfor except 127.0.0.1 header x-real-ip
	server     ${element.name} ${element.ip}:${element.port} ${useSSLVerify} maxconn 50000 weight 10 check
	`
	
	})

    // for deleted relays, return 403 from haproxy directly
    let deleted_domains = ``
    fetchDeletedDomains.forEach((element, counter) => {
        deleted_domains = deleted_domains + `
        http-request return content-type text/html status 410 file /etc/haproxy/static/410.http if { hdr(Host) -i ${element.name}.${element.domain} }
        `
    })

    let paused_domains = ``
    fetchPausedDomains.forEach((element, counter) => {
        paused_domains = paused_domains + `
        http-request return content-type text/html status 402 file /etc/haproxy/static/402.http if { hdr(Host) -i ${element.name}.${element.domain} }
        `
    })


	const haproxy_cfg = `
global
	log /dev/log	local0
	log /dev/log	local1 notice
	#chroot /usr/local/var/lib/haproxy
	stats socket /tmp/admin.sock mode 660 level admin
    stats socket /etc/haproxy/haproxy.sock mode 660 level user
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
    hard-stop-after 120s

defaults
	log	global
	mode	http
	option	httplog
	option	dontlognull
    timeout connect 20s
    timeout client  60s
    timeout server  60s
	timeout tunnel 300s
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
    acl is_acme_challenge path_beg /.well-known/acme-challenge/
    use_backend certbot_server if is_acme_challenge
    http-request allow if is_acme_challenge
    redirect scheme https code 301 if !is_acme_challenge !{ ssl_fc }

frontend secured
	bind			0.0.0.0:443 ssl crt /etc/haproxy/certs/${pemName}

	mode			http
	backlog			4096
	maxconn			60000      
	default_backend		main	
	http-request del-header x-real-ip
	option forwardfor except 127.0.0.1 header x-real-ip

    http-request set-header host %[hdr(host),field(1,:)]
    capture request header Host len 30

	http-request return content-type image/x-icon file /etc/haproxy/static/favicon.ico if { path /favicon.ico }
	http-request return content-type image/png file /etc/haproxy/static/favicon-32x32.png if { path /favicon-32x32.png }
	http-request return content-type image/png file /etc/haproxy/static/favicon-16x16.png if { path /favicon-16x16.png }
	http-request return content-type image/png file /etc/haproxy/static/apple-touch-icon.png if { path /apple-touch-icon.png }
	http-request return content-type application/json file /etc/haproxy/static/apple-touch-icon.png if { path /site.webmanifest }

    ${deleted_domains}

    ${paused_domains}

	${haproxy_subdomains_cfg}
    
    ${previewFrontend}

backend main
	mode  		        http
	option 		        redispatch
	balance 	        roundrobin
	option forwardfor except 127.0.0.1 header x-real-ip
    ${app_servers_cfg}

	${haproxy_backends_cfg}

    ${previewBackend}

backend certbot_server
    server certbot 127.0.0.1:10000

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