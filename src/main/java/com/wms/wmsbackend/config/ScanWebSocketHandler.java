package com.wms.wmsbackend.config;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class ScanWebSocketHandler extends TextWebSocketHandler {

    // 用于存储所有连接的 PC 客户端，Key 为 clientId (如: pc_1)
    private static final Map<String, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String clientId = getClientId(session);
        if (clientId != null) {
            sessions.computeIfAbsent(clientId, k -> new CopyOnWriteArraySet<>()).add(session);
            System.out.println("PC 客户端已连接 (Client connected): " + clientId);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String clientId = getClientId(session);
        if (clientId != null) {
            Set<WebSocketSession> clientSessions = sessions.get(clientId);
            if (clientSessions != null) {
                clientSessions.remove(session);
                if (clientSessions.isEmpty()) {
                    sessions.remove(clientId);
                }
            }
            System.out.println("PC 客户端已断开 (Client disconnected): " + clientId);
        }
    }

    // 供 Controller 调用的推送方法
    public void sendMessageToClient(String clientId, String message) {
        Set<WebSocketSession> clientSessions = sessions.get(clientId);
        if (clientSessions != null && !clientSessions.isEmpty()) {
            System.out.println("Pushing message to clientId: " + clientId + " (Sessions: " + clientSessions.size() + ")");
            for (WebSocketSession session : clientSessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(new TextMessage(message));
                    } catch (IOException e) {
                        System.err.println("Failed to send message to session " + session.getId() + ": " + e.getMessage());
                    }
                } else {
                    System.out.println("Session " + session.getId() + " is closed, skipping.");
                }
            }
        } else {
            System.out.println("No active sessions found for clientId: " + clientId);
        }
    }

    private String getClientId(WebSocketSession session) {
        String query = session.getUri().getQuery();
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] pair = param.split("=");
            if (pair.length == 2 && "clientId".equals(pair[0])) {
                return pair[1];
            }
        }
        return null;
    }
}