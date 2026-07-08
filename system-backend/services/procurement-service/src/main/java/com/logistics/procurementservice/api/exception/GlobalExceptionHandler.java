package com.logistics.procurementservice.api.exception;

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
        int status = switch (ex.getCode()) {
            case "NOT_FOUND" -> 404;
            case "CONFLICT" -> 409;
            case "VALIDATION_ERROR" -> 422;
            case "INVALID_CREDENTIALS",
                 "ACCOUNT_DEACTIVATED" -> 401;
            case "INVALID_STATE_TRANSITION" -> 400;
            case "SERVICE_UNAVAILABLE" -> 503;
            case "INTERNAL_ERROR" -> 500;
            default -> 400;
        };
        return ResponseEntity.status(status)
            .body(new ErrorResponse(ex.getCode(), ex.getMessage(), null));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handle(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = ex.getBindingResult()
            .getFieldErrors().stream()
            .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage));
        return ResponseEntity.status(422)
            .body(new ErrorResponse("VALIDATION_ERROR", "Request validation failed", fieldErrors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handle(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(500)
            .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred", null));
    }

    public record ErrorResponse(String code, String message, Object details) {}
}
