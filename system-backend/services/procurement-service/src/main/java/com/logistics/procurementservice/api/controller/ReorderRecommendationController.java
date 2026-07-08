package com.logistics.procurementservice.api.controller;

import com.logistics.procurementservice.application.dto.response.ReorderRecommendationResponse;
import com.logistics.procurementservice.application.service.ReorderRecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/procurement/reorder-recommendations")
@RequiredArgsConstructor
public class ReorderRecommendationController {

    private final ReorderRecommendationService reorderRecommendationService;

    @GetMapping
    public List<ReorderRecommendationResponse> list(
        @RequestParam(required = false) String urgency
    ) {
        return reorderRecommendationService.listRecommendations(urgency);
    }
}
