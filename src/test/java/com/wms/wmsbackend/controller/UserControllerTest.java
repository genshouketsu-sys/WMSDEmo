package com.wms.wmsbackend.controller;

import com.wms.wmsbackend.entity.User;
import com.wms.wmsbackend.mapper.UserMapper;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@RunWith(MockitoJUnitRunner.class)
public class UserControllerTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private UserController userController;

    @Before
    public void setUp() {
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("testuser");
    }

    @Test
    public void testGetProfile_UserFound() {
        User user = new User();
        user.setUsername("testuser");
        user.setDisplayName("Test User");
        user.setEmail("test@example.com");
        
        when(userMapper.findByUsername("testuser")).thenReturn(user);

        ResponseEntity<?> response = userController.getProfile();
        
        assertEquals(200, response.getStatusCode().value());
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("testuser", body.get("username"));
        assertEquals("Test User", body.get("displayName"));
    }

    @Test
    public void testGetProfile_UserNotFound() {
        when(userMapper.findByUsername("testuser")).thenReturn(null);

        ResponseEntity<?> response = userController.getProfile();
        
        assertEquals(404, response.getStatusCode().value());
        assertEquals("User not found", response.getBody());
    }

    @Test
    public void testUpdateProfile() {
        User user = new User();
        user.setUsername("testuser");
        
        when(userMapper.findByUsername("testuser")).thenReturn(user);

        Map<String, String> payload = new HashMap<>();
        payload.put("displayName", "New Name");
        
        ResponseEntity<?> response = userController.updateProfile(payload);
        
        assertEquals(200, response.getStatusCode().value());
        verify(userMapper, times(1)).updateProfile(user);
        assertEquals("New Name", user.getDisplayName());
    }

    @Test
    public void testUpdatePassword_Success() {
        User user = new User();
        user.setUsername("testuser");
        user.setPasswordHash("hashed_old_password");
        
        when(userMapper.findByUsername("testuser")).thenReturn(user);
        when(passwordEncoder.matches("old_password", "hashed_old_password")).thenReturn(true);
        when(passwordEncoder.encode("new_password")).thenReturn("hashed_new_password");

        Map<String, String> payload = new HashMap<>();
        payload.put("currentPassword", "old_password");
        payload.put("newPassword", "new_password");

        ResponseEntity<?> response = userController.updatePassword(payload);
        
        assertEquals(200, response.getStatusCode().value());
        assertEquals("hashed_new_password", user.getPasswordHash());
        verify(userMapper, times(1)).updatePassword(user);
    }
    
    @Test
    public void testUpdatePassword_IncorrectCurrent() {
        User user = new User();
        user.setUsername("testuser");
        user.setPasswordHash("hashed_old_password");
        
        when(userMapper.findByUsername("testuser")).thenReturn(user);
        when(passwordEncoder.matches("wrong_password", "hashed_old_password")).thenReturn(false);

        Map<String, String> payload = new HashMap<>();
        payload.put("currentPassword", "wrong_password");
        payload.put("newPassword", "new_password");

        ResponseEntity<?> response = userController.updatePassword(payload);
        
        assertEquals(400, response.getStatusCode().value());
        verify(userMapper, never()).updatePassword(any(User.class));
    }
}
