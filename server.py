import http.server

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add headers to prevent caching
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

if __name__ == "__main__":
    server_address = ('', 8084)  # Serve on all addresses, port 8082
    httpd = http.server.HTTPServer(server_address, NoCacheHTTPRequestHandler)
    print("Serving on port 8084...")
    httpd.serve_forever()
