package com.logistics.ordermanagementservice.api.controller;

import com.logistics.ordermanagementservice.application.dto.request.CancelOrderRequest;
import com.logistics.ordermanagementservice.application.dto.request.CreateOrderRequest;
import com.logistics.ordermanagementservice.application.dto.request.InitiateReturnRequest;
import com.logistics.ordermanagementservice.application.dto.response.OrderItemResponse;
import com.logistics.ordermanagementservice.application.dto.response.OrderResponse;
import com.logistics.ordermanagementservice.application.dto.response.OrderStatusHistoryResponse;
import com.logistics.ordermanagementservice.application.dto.response.ProductPipelineDemandDto;
import com.logistics.ordermanagementservice.application.dto.response.ReturnOrderResponse;
import com.logistics.ordermanagementservice.application.service.OrderService;
import com.logistics.ordermanagementservice.application.service.ReturnOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private static final UUID SUBMIT_ACTOR = UUID.fromString("c0000000-0000-0000-0000-000000000001");

    private final OrderService orderService;
    private final ReturnOrderService returnOrderService;

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        OrderResponse response = orderService.createOrder(request);
        return ResponseEntity
            .created(URI.create("/api/v1/orders/" + response.orderId()))
            .body(response);
    }

    @GetMapping("/analytics/pipeline-demand-by-product")
    public ResponseEntity<List<ProductPipelineDemandDto>> pipelineDemandByProduct() {
        return ResponseEntity.ok(orderService.pipelineDemandByProduct());
    }

    @GetMapping
    public ResponseEntity<Page<OrderResponse>> listOrders(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) UUID warehouseId
    ) {
        return ResponseEntity.ok(orderService.listOrders(PageRequest.of(page - 1, limit), status, warehouseId));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.getOrder(orderId));
    }

    @GetMapping("/{orderId}/items")
    public ResponseEntity<List<OrderItemResponse>> getOrderItems(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.listOrderItems(orderId));
    }

    @GetMapping("/{orderId}/history")
    public ResponseEntity<List<OrderStatusHistoryResponse>> getOrderHistory(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.listOrderHistory(orderId));
    }

    @PostMapping("/{orderId}/submit")
    public ResponseEntity<OrderResponse> submitOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.submitOrder(orderId, SUBMIT_ACTOR));
    }

    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
        @PathVariable UUID orderId,
        @Valid @RequestBody CancelOrderRequest request
    ) {
        return ResponseEntity.ok(orderService.cancelOrder(orderId, request));
    }

    @PostMapping("/{orderId}/deliver")
    public ResponseEntity<OrderResponse> markDelivered(@PathVariable UUID orderId) {
        return ResponseEntity.ok(orderService.markDelivered(orderId, SUBMIT_ACTOR));
    }

    @PostMapping("/{orderId}/return")
    public ResponseEntity<ReturnOrderResponse> initiateReturn(
        @PathVariable UUID orderId,
        @Valid @RequestBody InitiateReturnRequest request
    ) {
        ReturnOrderResponse body = returnOrderService.initiate(orderId, request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .location(URI.create("/api/v1/orders/returns/" + body.returnId()))
            .body(body);
    }
}
