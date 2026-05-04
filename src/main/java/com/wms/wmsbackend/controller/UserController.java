package com.wms.wmsbackend.controller;

import com.wms.wmsbackend.entity.User;
import com.wms.wmsbackend.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userMapper.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(404).body("User not found");
        }
        
        Map<String, Object> profile = new HashMap<>();
        profile.put("username", user.getUsername());
        profile.put("displayName", user.getDisplayName());
        profile.put("email", user.getEmail());
        profile.put("avatarUrl", user.getAvatarUrl());
        profile.put("role", user.getRole());
        
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/update-profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> payload) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userMapper.findByUsername(username);
        
        if (user == null) {
            return ResponseEntity.status(404).body("User not found");
        }

        if (payload.containsKey("displayName")) {
            user.setDisplayName(payload.get("displayName"));
        }
        if (payload.containsKey("email")) {
            user.setEmail(payload.get("email"));
        }
        if (payload.containsKey("avatarUrl")) {
            user.setAvatarUrl(payload.get("avatarUrl"));
        }

        userMapper.updateProfile(user);
        return ResponseEntity.ok("Profile updated successfully");
    }

    @PostMapping("/update-password")
    public ResponseEntity<?> updatePassword(@RequestBody Map<String, String> payload) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userMapper.findByUsername(username);
        
        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "Incorrect current password");
            return ResponseEntity.status(400).body(error);
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userMapper.updatePassword(user);
        
        return ResponseEntity.ok("Password updated successfully");
    }
}
