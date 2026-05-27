package xyz.outlinr.api.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import xyz.outlinr.api.dto.deploy.BuildJobPayload;
import xyz.outlinr.api.service.BuildQueueService;

@Slf4j
@Service
@RequiredArgsConstructor
public class BuildQueueServiceImpl implements BuildQueueService {
    private static final String QUEUE_KEY = "build_queue";

    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, String> redisTemplate;

    @Override
    public void push(BuildJobPayload payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            redisTemplate.opsForList().leftPush(QUEUE_KEY, json);
            log.info("Pushed build job to Redis queue. deploymentId={} appId={}",
                    payload.getDeploymentId(), payload.getAppId());
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize build job payload", e);
        }
    }
}
