package com.wms.wmsbackend.security;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.SecureRandom;
import java.util.*;
import java.util.function.Function;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {
    private final Key key;
    public JwtUtil(@Value("${wms.jwt.secret:}") String secret,
                   @Value("${wms.jwt.key-file:.wms/jwt.key}") String keyFile) throws java.io.IOException {
        if (secret.isBlank()) {
            Path path = Path.of(keyFile).toAbsolutePath();
            Files.createDirectories(path.getParent());
            if (!Files.exists(path)) {
                byte[] bytes = new byte[48];
                new SecureRandom().nextBytes(bytes);
                try { Files.writeString(path, Base64.getEncoder().encodeToString(bytes), StandardOpenOption.CREATE_NEW); }
                catch (FileAlreadyExistsException ignored) { /* Another instance initialized it. */ }
            }
            secret = Files.readString(path).trim();
        }
        key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    private Claims claims(String token) { return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody(); }
    public <T> T extractClaim(String token, Function<Claims,T> resolver) { return resolver.apply(claims(token)); }
    public String extractUsername(String token) { return extractClaim(token, Claims::getSubject); }
    public Date extractExpiration(String token) { return extractClaim(token, Claims::getExpiration); }
    public String purpose(String token) { return claims(token).get("purpose", String.class); }
    public String generateToken(UserDetails user) { return generate(user.getUsername(), "access", 10 * 60 * 60 * 1000L); }
    public String scanToken(String username) { return generate(username, "scan", 8 * 60 * 60 * 1000L); }
    private String generate(String username, String purpose, long ttl) {
        return Jwts.builder().setSubject(username).claim("purpose", purpose).setId(UUID.randomUUID().toString())
            .setIssuedAt(new Date()).setExpiration(new Date(System.currentTimeMillis() + ttl))
            .signWith(key, SignatureAlgorithm.HS256).compact();
    }
    public Boolean validateToken(String token, UserDetails user) {
        return "access".equals(purpose(token)) && extractUsername(token).equals(user.getUsername());
    }
}