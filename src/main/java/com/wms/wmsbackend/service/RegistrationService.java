package com.wms.wmsbackend.service;
import com.wms.wmsbackend.entity.User;
import com.wms.wmsbackend.mapper.UserMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {
    private final UserMapper users;
    private final PasswordEncoder encoder;
    public RegistrationService(UserMapper users, PasswordEncoder encoder) { this.users=users; this.encoder=encoder; }
    @Transactional
    public void register(String username, String password) {
        if (username == null || username.isBlank() || username.length() > 50 || password == null || password.isBlank() || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw new IllegalArgumentException("用户名或密码为空，或长度超过限制。");
        users.lockRegistration();
        if (users.findByUsername(username) != null) throw new IllegalArgumentException("Username already exists");
        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(encoder.encode(password));
        user.setRole(users.countUsers() == 0 ? "ROLE_ADMIN" : "ROLE_OPERATOR");
        users.insert(user);
    }
}