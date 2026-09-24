package com.wms.wmsbackend.controller;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final JdbcTemplate jdbc;
    public AdminController(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @GetMapping("/users")
    public List<Map<String,Object>> users() {
        return jdbc.queryForList("SELECT id,username,role,display_name AS displayName FROM wms_user ORDER BY id");
    }
    @PutMapping("/users/{id}/role")
    @Transactional
    public Map<String,Object> role(@PathVariable Long id,@RequestBody Map<String,String> body,Principal actor) {
        String role=body.get("role");
        if (!List.of("ROLE_ADMIN","ROLE_OPERATOR").contains(role)) throw new IllegalArgumentException("无效角色。");
        jdbc.queryForObject("SELECT id FROM wms_system_lock WHERE id=1 FOR UPDATE",Integer.class);
        var current=jdbc.queryForList("SELECT username,role FROM wms_user WHERE id=?",id);
        if (current.isEmpty()) throw new IllegalArgumentException("用户不存在。");
        if ("ROLE_ADMIN".equals(current.get(0).get("role")) && !"ROLE_ADMIN".equals(role)) {
            int admins=jdbc.queryForObject("SELECT COUNT(*) FROM wms_user WHERE role='ROLE_ADMIN'",Integer.class);
            if (admins<=1 || actor.getName().equals(current.get(0).get("username")))
                throw new IllegalArgumentException("不能移除最后一名管理员或自己的管理员权限。");
        }
        jdbc.update("UPDATE wms_user SET role=? WHERE id=?",role,id);
        return Map.of("success",true);
    }
}