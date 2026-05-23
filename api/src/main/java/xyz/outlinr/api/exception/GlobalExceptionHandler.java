package xyz.outlinr.api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import xyz.outlinr.api.dto.DefaultApiResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleException(Exception ex) {
        log.error("Unhandled exception caught: ", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(DefaultApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Internal Server Error"));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<DefaultApiResponse<Void>> handleRuntimeException(RuntimeException ex) {
        log.warn("Runtime exception caught: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(DefaultApiResponse.error(ex.getMessage() != null ? ex.getMessage() : "Bad Request"));
    }
}
