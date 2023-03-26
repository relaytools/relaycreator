import { getSession } from "next-auth/react";
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]"
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/sconfig/haproxy/:id
// Download config file for haproxy for this server 
export default async function handle(req: any, res: any) {
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
        res.status(404).json({ "error": "server not found" })
        res.end()
        return
    }

    /*
    if (myUser.role != "machine") {
        res.status(404).json({ "error": "no privileges" })
        res.end()
        return
    }
    */

    // load the following from prisma:
    // the hostnames that haproxy serves on this machine
    // the backends with port# for strfry backends
    // the certificates locations

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
	redirect 		prefix https://nostr21.com code 301 

frontend secured
	bind			0.0.0.0:443 ssl crt /etc/haproxy/certs/localhost.pem
	mode			http
	timeout			client   3600s
	backlog			4096
	maxconn			60000      
	#default_backend		www_backend
	http-request del-header x-real-ip
	option forwardfor except 127.0.0.1 header x-real-ip
	# Track HTTP request rate only on these URLs
	acl throttled_url path_beg -i /
	# IPs excluded from temporary deny feature
	#acl throttle_exclude req.hdr_ip(X-Forwarded-For) -f /etc/haproxy/lists/throttle_exclude.lst
	# Identify unique clients based on temporary header
	http-request set-header X-SB-Track %[req.fhdr(Host)]_%[req.fhdr(X-Forwarded-For)]_%[req.fhdr(User-Agent)]
	# base64 encode temporary tracking header
	http-request set-header X-Concat %[req.fhdr(X-SB-Track),base64]
	# Remove temporary tracking header
	http-request del-header X-SB-Track
	# stick-table for tracking HTTP request rate and the number of concurrently open connections
	# We track request rate within 10-second sliding window
	stick-table type binary len 64 size 100k store gpc0_rate(10s),conn_cur expire 4m
	# clients that were "seen" by HAProxy
	acl mark_seen sc0_inc_gpc0 gt 0
	# clients that have exceeded HTTP request rate threshold
	acl fast_refresher sc0_gpc0_rate gt 10
	# clients that have more than 20 concurrently open connections
	acl conn_limit sc0_conn_cur gt 20
	# ip_is_bad increments gpc0 counter every time it's evaluated
	acl ip_is_bad sc1_inc_gpc0(bk_stick_blocked) gt 0
	# Track X-Concat header each time throttled_url is requested
	http-request track-sc0 hdr(X-Concat) if throttled_url
	# Track all requests for the throttled_url in a separate stick-table (bk_stick_blocked)
	http-request track-sc1 hdr_ip(X-Forwarded-For) table bk_stick_blocked if throttled_url
	# Increment the counter and therefore block the IP that was detected as a fast_refresher
	# IP is stored in stick-table bk_stick_blocked
	#http-request track-sc1 hdr_ip(X-Forwarded-For) table bk_stick_blocked if fast_refresher ip_is_bad !throttle_exclude
	http-request track-sc1 hdr_ip(X-Forwarded-For) table bk_stick_blocked if fast_refresher ip_is_bad
	# Check if the client's IP is blocked
	acl ip_was_bad sc1_get_gpc0(bk_stick_blocked) gt 0
	acl is-blocked-ip src -f /etc/haproxy/blocklisted.ips 
	http-request deny if is-blocked-ip
	# Deny access to blocked IP
	#http-request deny if ip_was_bad !throttle_exclude
	#http-request deny if ip_was_bad
	#filter bwlim-in myuploadlimit default-limit 5000 default-period 5m
	#http-request set-bandwidth-limit myuploadlimit
	#filter bwlim-in myuploadlimit limit 62500 key src table bk_stick_rate
	#http-request set-bandwidth-limit myuploadlimit
	http-request deny if ip_was_bad

	#http-request return content-type image/x-icon file /etc/haproxy/static/apple-touch-icon.png  \
    #if { path /apple-touch-icon.png }

	#http-request return content-type image/x-icon file /etc/haproxy/static/favicon-32x32.png  \
    #if { path /favicon-32x32.png }

	http-request return content-type image/x-icon file /etc/haproxy/static/favicon.ico if { path /favicon.ico }
	http-request return content-type image/png file /etc/haproxy/static/favicon-32x32.png if { path /favicon-32x32.png }
	http-request return content-type image/png file /etc/haproxy/static/favicon-16x16.png if { path /favicon-16x16.png }
	http-request return content-type image/png file /etc/haproxy/static/apple-touch-icon.png if { path /apple-touch-icon.png }
	http-request return content-type application/json file /etc/haproxy/static/apple-touch-icon.png if { path /site.webmanifest }

	# if the client has too many open connections, return 429 error
	use_backend bk_429 if mark_seen conn_limit
	# if the trusted client exceeded HTTP request rate, return 429 error
	use_backend bk_429 if mark_seen fast_refresher

	#default_backend www_backend
	acl host_ws hdr_beg(Host) -i ws.
	use_backend www_backend if host_ws
	acl hdr_connection_upgrade hdr(Connection)  -i upgrade
	acl hdr_upgrade_websocket  hdr(Upgrade)     -i websocket
	use_backend www_backend if hdr_connection_upgrade hdr_upgrade_websocket
	acl is-path-static-index    path /
  	use_backend backend_static_index    if is-path-static-index

	default_backend www_backend

backend www_backend
    mode  		        http
    option 		        redispatch
    balance 	        source
	option forwardfor except 127.0.0.1 header x-real-ip
	server     websocket-001 172.17.0.2:7777 maxconn 50000 weight 10 check
	stick-table type binary len 64 size 100k store gpc0_rate(10s),conn_cur expire 4m

backend bk_stick_blocked
    stick-table type ip size 100k expire 1h store gpc0

#backend bk_stick_rate
#    stick-table type ip size 1m expire 3600s store bytes_in_rate(5m)

backend bk_429
    errorfile 429 /etc/haproxy/errors/429.http
    http-request deny deny_status 429

listen stats
	bind 0.0.0.0:8888 ssl crt  /etc/haproxy/certs/localhost.pem
        mode            	http
        stats           	enable
        option          	httplog
        stats           	show-legends
        stats          		uri /haproxy
        stats           	realm Haproxy\ Statistics
        stats           	refresh 5s
        stats           	auth me:somesecretpass
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
    res.setHeader('Content-disposition', 'filename="boring.env"');
    res.end(haproxy_cfg);
}