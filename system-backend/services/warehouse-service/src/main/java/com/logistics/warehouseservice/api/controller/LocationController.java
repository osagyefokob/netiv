package com.logistics.warehouseservice.api.controller;

import com.logistics.warehouseservice.application.dto.request.CreateLocationRequest;
import com.logistics.warehouseservice.application.dto.response.LocationResponse;
import com.logistics.warehouseservice.application.service.LocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/warehouse/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @PostMapping("/{warehouseId}")
    public ResponseEntity<LocationResponse> addLocation(
        @PathVariable UUID warehouseId,
        @Valid @RequestBody CreateLocationRequest request
    ) {
        LocationResponse response = locationService.addLocation(warehouseId, request);
        return ResponseEntity
            .created(URI.create("/api/v1/warehouse/locations/" + response.locationId()))
            .body(response);
    }

    @GetMapping
    public ResponseEntity<List<LocationResponse>> getLocations(@RequestParam UUID warehouseId) {
        return ResponseEntity.ok(locationService.getLocations(warehouseId));
    }

    @GetMapping("/{locationId}")
    public ResponseEntity<LocationResponse> getLocation(@PathVariable UUID locationId) {
        return ResponseEntity.ok(locationService.getLocation(locationId));
    }
}
