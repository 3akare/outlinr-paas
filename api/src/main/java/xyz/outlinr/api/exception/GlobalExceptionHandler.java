package xyz.outlinr.api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import xyz.outlinr.api.dto.DefaultApiResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        log.warn("Validation failed: {}", ex.getMessage());
        String fieldMessage = ex.getBindingResult().getFieldError() != null 
                ? ex.getBindingResult().getFieldError().getDefaultMessage() 
                : "Invalid request fields";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(DefaultApiResponse.error("Validation failed: " + fieldMessage));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleMalformedJson(HttpMessageNotReadableException ex) {
        log.warn("Malformed JSON payload received: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(DefaultApiResponse.error("Malformed request payload. Check JSON syntax."));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("Type mismatch on parameter: name={}, value={}", ex.getName(), ex.getValue());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(DefaultApiResponse.error(String.format("Parameter '%s' has an invalid value.", ex.getName())));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.error("Data integrity violation: ", ex);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(DefaultApiResponse.error("Operation violates database constraints. Check duplicate keys or missing foreign records."));
    }

    @ExceptionHandler(CannotAcquireLockException.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleDeadlock(CannotAcquireLockException ex) {
        log.error("Database lock acquisition failure detected: ", ex);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(DefaultApiResponse.error("Database is currently busy or a deadlock occurred. Please try your request again."));
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        log.warn("Optimistic locking conflict: ", ex);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(DefaultApiResponse.error("The resource was modified concurrently by another process. Please reload and try again."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied exception: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(DefaultApiResponse.error("Access is denied. Insufficient permissions."));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Illegal argument exception: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(DefaultApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleIllegalState(IllegalStateException ex) {
        log.warn("Illegal state exception: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(DefaultApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        log.warn("Runtime exception caught: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(DefaultApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Bad Request"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleException(Exception ex) {
        log.error("Unhandled exception caught: ", ex);
        // STRICT MASK: Never leak database details, internal classes, or exact stack trace to client
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(DefaultApiResponse.error("An unexpected error occurred. Please try again or contact support."));
    }
}
