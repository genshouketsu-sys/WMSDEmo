package com.wms.wmsbackend.security;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Autowired private JwtUtil jwtUtil;
    @Autowired private CustomUserDetailsService userDetailsService;
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String bearer = request.getHeader("Authorization");
        String scanToken = request.getHeader("X-Scan-Token");
        try {
            if (scanToken != null && List.of("/api/scan/push", "/api/scan/undo").contains(request.getServletPath())) {
                if (!"scan".equals(jwtUtil.purpose(scanToken))) throw new IllegalArgumentException("Invalid pairing");
                UserDetails user = userDetailsService.loadUserByUsername(jwtUtil.extractUsername(scanToken));
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                    user, null, List.of(new SimpleGrantedAuthority("ROLE_SCANNER"))));
            } else if (bearer != null && bearer.startsWith("Bearer ")) {
                String token = bearer.substring(7);
                UserDetails user = userDetailsService.loadUserByUsername(jwtUtil.extractUsername(token));
                if (!jwtUtil.validateToken(token, user)) throw new IllegalArgumentException("Invalid token");
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
            }
        } catch (Exception invalid) {
            SecurityContextHolder.clearContext();
            response.setStatus(401);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"登录或扫码配对已过期，请重新连接。\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}