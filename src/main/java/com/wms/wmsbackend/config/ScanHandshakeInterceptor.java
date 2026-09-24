package com.wms.wmsbackend.config;
import com.wms.wmsbackend.security.*;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.http.server.*;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class ScanHandshakeInterceptor implements HandshakeInterceptor {
    private final JwtUtil jwt;
    private final CustomUserDetailsService users;
    public ScanHandshakeInterceptor(JwtUtil jwt, CustomUserDetailsService users) { this.jwt = jwt; this.users = users; }
    @Override public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
            WebSocketHandler handler, Map<String,Object> attributes) {
        try {
            String token = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst("token");
            if (!"scan".equals(jwt.purpose(token))) throw new IllegalArgumentException();
            String username = users.loadUserByUsername(jwt.extractUsername(token)).getUsername();
            attributes.put("clientId", "pc_" + username);
            attributes.put("expiresAt", jwt.extractExpiration(token).getTime());
            return true;
        } catch (Exception e) { response.setStatusCode(HttpStatus.UNAUTHORIZED); return false; }
    }
    @Override public void afterHandshake(ServerHttpRequest a, ServerHttpResponse b, WebSocketHandler c, Exception d) { }
}