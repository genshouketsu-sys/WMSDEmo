package com.wms.wmsbackend.controller;

import com.wms.wmsbackend.dto.RestockSuggestionDto;
import com.wms.wmsbackend.service.RestockPredictionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/predictions")
public class PredictionController {

    @Autowired
    private RestockPredictionService predictionService;

    @GetMapping("/restock")
    public List<RestockSuggestionDto> getRestockSuggestions() {
        return predictionService.getRestockSuggestions();
    }
}
