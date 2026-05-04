package com.wms.wmsbackend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

@Service
public class ExternalProductService {

    @Value("${yahoo.appid:dj00aiZpPXp6U0Y1Y1Y1Y1Y1JnM9Y29uc3VtZXJzZWNyZXQmcmVzdD0w}") // Default placeholder
    private String appId;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, String> fetchFromYahoo(String barcode) {
        String url = String.format("https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?appid=%s&jan=%s", appId, barcode);
        Map<String, String> result = new HashMap<>();
        result.put("name", "Unknown Product");
        result.put("image", "");

        try {
            String response = restTemplate.getForObject(url, String.class);
            JsonNode root = objectMapper.readTree(response);
            JsonNode hits = root.path("hits");
            
            if (hits.isArray() && hits.size() > 0) {
                JsonNode firstHit = hits.get(0);
                result.put("name", firstHit.path("name").asText());
                result.put("image", firstHit.path("image").path("medium").asText());
            }
        } catch (Exception e) {
            System.err.println("Yahoo API Error: " + e.getMessage());
        }
        return result;
    }
}
