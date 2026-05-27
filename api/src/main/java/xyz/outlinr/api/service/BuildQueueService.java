package xyz.outlinr.api.service;

import xyz.outlinr.api.dto.deploy.BuildJobPayload;

public interface BuildQueueService {
    void push(BuildJobPayload payload);
}
