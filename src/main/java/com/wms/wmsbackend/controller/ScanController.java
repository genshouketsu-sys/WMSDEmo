package com.wms.wmsbackend.controller;
import com.wms.wmsbackend.annotation.Idempotent;
import com.wms.wmsbackend.config.ScanWebSocketHandler;
import com.wms.wmsbackend.security.JwtUtil;
import com.wms.wmsbackend.service.ScanService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/api/scan")
public class ScanController {
    private final ScanService scans;
    private final JwtUtil jwt;
    private final ScanWebSocketHandler sockets;
    public ScanController(ScanService scans, JwtUtil jwt, ScanWebSocketHandler sockets) { this.scans=scans;this.jwt=jwt;this.sockets=sockets; }
    private void changed(String user) { sockets.sendMessageToClient("pc_"+user,"{\"event\":\"SCANS_CHANGED\"}"); }
    @GetMapping("/pairing")
    public Map<String,String> pairing(Principal user) { return Map.of("token",jwt.scanToken(user.getName())); }
    @PostMapping("/push")
    public Map<String,Object> push(@RequestBody Map<String,String> body, Principal user) {
        var result=scans.push(user.getName(),body.get("barcode"),body.get("requestId"));
        changed(user.getName());return result;
    }
    @GetMapping("/ping") public ResponseEntity<Void> ping() { return ResponseEntity.ok().build(); }
    @PostMapping("/undo")
    public Map<String,Object> undo(Principal user) {
        boolean result=scans.undo(user.getName());changed(user.getName());return Map.of("success",result);
    }
    @GetMapping("/logs") public List<Map<String,Object>> logs(Principal user) { return scans.logs(user.getName()); }
    @PostMapping("/stock-in")
    public Map<String,Object> stockIn(@RequestBody List<Long> ids, Principal user) {
        scans.stockIn(user.getName(),ids);changed(user.getName());return Map.of("success",true);
    }
    @PostMapping("/dismiss")
    public Map<String,Object> dismiss(@RequestBody List<Long> ids, Principal user) {
        scans.dismiss(user.getName(),ids);changed(user.getName());return Map.of("success",true);
    }
}