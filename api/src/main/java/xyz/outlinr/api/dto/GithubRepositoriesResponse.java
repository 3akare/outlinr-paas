package xyz.outlinr.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
public class GithubRepositoriesResponse {
    @JsonProperty("total_count")
    private int totalCount;
    private List<GithubRepositoryDto> repositories;
}
