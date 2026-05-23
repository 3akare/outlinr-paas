package xyz.outlinr.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DefaultApiResponse<T> {
    private boolean success;
    private String message;
    private T data;

    public static <T> DefaultApiResponse<T> success(T data) {
        return DefaultApiResponse.<T>builder()
                .success(true)
                .data(data)
                .build();
    }

    public static <T> DefaultApiResponse<T> success(T data, String message) {
        return DefaultApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .build();
    }

    public static <T> DefaultApiResponse<T> error(String message) {
        return DefaultApiResponse.<T>builder()
                .success(false)
                .message(message)
                .build();
    }
}
