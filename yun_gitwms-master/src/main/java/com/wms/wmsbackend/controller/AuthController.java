package com.wms.wmsbackend.controller;

import com.wms.wmsbackend.security.JwtUtil;
import com.wms.wmsbackend.entity.User;
import com.wms.wmsbackend.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private com.wms.wmsbackend.mapper.UserMapper userMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest registerRequest) {
        if (userMapper.findByUsername(registerRequest.getUsername()) != null) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Username already exists");
            return ResponseEntity.status(400).body(error);
        }

        com.wms.wmsbackend.entity.User newUser = new com.wms.wmsbackend.entity.User();
        newUser.setUsername(registerRequest.getUsername());
        newUser.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
        newUser.setRole("ROLE_ADMIN");
        
        userMapper.insert(newUser);
        
        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
            );
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Invalid username or password");
            return ResponseEntity.status(401).body(error);
        }

        final UserDetails userDetails = userDetailsService.loadUserByUsername(loginRequest.getUsername());
        final String jwt = jwtUtil.generateToken(userDetails);

        Map<String, String> response = new HashMap<>();
        response.put("token", jwt);
        response.put("username", userDetails.getUsername());
        
        return ResponseEntity.ok(response);
    }

    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class RegisterRequest {
        private String username;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }
}
