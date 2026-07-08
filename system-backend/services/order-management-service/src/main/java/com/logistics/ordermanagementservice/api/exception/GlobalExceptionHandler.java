package com.logistics.ordermanagementservice.api.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handle(BusinessException ex) {
        log.warn("Business exception: code={}, message={}", ex.getCode(), ex.getMessage());
        int status = switch (ex.getCode()) {
            case "NOT_FOUND" -> 404;
            case "CONFLICT", "INSUFFICIENT_STOCK", "INVALID_STATE_TRANSITION", "INVALID_STATE" -> 409;
            case "VALIDATION_ERROR" -> 422;
            case "INVALID_CREDENTIALS", "ACCOUNT_DEACTIVATED" -> 401;
            case "INTERNAL_ERROR" -> 500;
            default -> 400;
        };
        return ResponseEntity.status(status)
            .body(new ErrorResponse(ex.getCode(), ex.getMessage(), Map.of()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handle(MethodArgumentNotValidException ex) {
        Map<String, Object> fieldErrors = ex.getBindingResult()
            .getFieldErrors().stream()
            .collect(Collectors.toMap(FieldError::getField, f -> (Object) f.getDefaultMessage()));
        log.warn("Validation error: {}", fieldErrors);
        return ResponseEntity.status(422)
            .body(new ErrorResponse("VALIDATION_ERROR", "Request validation failed", fieldErrors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handle(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(500)
            .body(new ErrorResponse("INTERNAL_ERROR", ex.getMessage(), Map.of()));
    }

    public record ErrorResponse(String code, String message, Map<String, Object> details) {}
}
