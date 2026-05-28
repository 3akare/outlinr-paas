package xyz.outlinr.api.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import xyz.outlinr.api.dto.deploy.*;
import xyz.outlinr.api.dto.enums.DeploymentStatus;
import xyz.outlinr.api.entity.App;
import xyz.outlinr.api.entity.Deployment;
import xyz.outlinr.api.entity.EnvironmentVariable;
import xyz.outlinr.api.entity.User;
import xyz.outlinr.api.repository.AppRepository;
import xyz.outlinr.api.repository.DeploymentRepository;
import xyz.outlinr.api.repository.EnvironmentVariableRepository;
import xyz.outlinr.api.repository.UserRepository;
import xyz.outlinr.api.service.DeploymentService;
import xyz.outlinr.api.service.GithubAppService;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeploymentServiceImpl implements DeploymentService {
    private final AppRepository appRepository;
    private final UserRepository userRepository;
    private final GithubAppService githubAppService;
    private final DeploymentRepository deploymentRepository;
    private final EnvironmentVariableRepository environmentVariableRepository;
    private final AsyncDeploymentTask asyncDeploymentTask;

    @Override
    public UUID deploy(DeployRequest deployRequest, UUID userId) {
        String name = deployRequest.getName().toLowerCase().trim();

        if (!name.matches("^[a-z0-9-]+$"))
            throw new IllegalArgumentException("Invalid name. Only lowercase alphanumeric characters and hyphens are allowed.");

        if (appRepository.existsByName(name))
            throw new IllegalArgumentException("Name already exists.");

        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        App app = App.builder()
                .user(user)
                .name(name)
                .repoFullName(deployRequest.getRepoFullName())
                .branch(deployRequest.getBranch() != null ? deployRequest.getBranch() : "main")
                .appPort(deployRequest.getAppPort())
                .githubInstallationId(user.getGithubInstallationId())
                .build();
        appRepository.save(app);
        log.info("App record created. appId={} name={}", app.getId(), name);

        if (deployRequest.getEnvironmentVars() != null && !deployRequest.getEnvironmentVars().isEmpty()) {
            List<EnvironmentVariable> environmentVariables = new ArrayList<>();
            for (DeployRequest.EnvironmentVars envVar : deployRequest.getEnvironmentVars()) {
                EnvironmentVariable environmentVariable = new EnvironmentVariable();
                environmentVariable.setApp(app);
                environmentVariable.setKey(envVar.getKey());
                environmentVariable.setValue(envVar.getValue());
                environmentVariables.add(environmentVariable);
            }
            environmentVariableRepository.saveAll(environmentVariables);
            log.info("Saved {} env var(s) for appId={}", environmentVariables.size(), app.getId());
        }

        Deployment deployment = new Deployment();
        deployment.setApp(app);
        deployment.setStatus(DeploymentStatus.STARTED.name());
        deployment = deploymentRepository.save(deployment);
        log.info("Deployment record created. deploymentId={} appId={} status={}",
                deployment.getId(), app.getId(), deployment.getStatus());

        asyncDeploymentTask.startDeployment(deployment, deployRequest, app, user.getGithubInstallationId());
        return deployment.getId();
    }

    @Override
    public NameAvailabilityResponse checkName(String name) {
        NameAvailabilityResponse response = new NameAvailabilityResponse();
        response.setAvailable(!appRepository.existsByName(name.toLowerCase().trim()));
        return response;
    }

    @Override
    public RepoValidationResponse validateRepo(String repoFullName, UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        RepoValidationResponse response = new RepoValidationResponse();
        response.setHasDockerFile(githubAppService.hasDockerFile(repoFullName, user.getGithubInstallationId()));
        return response;
    }

    @Override
    public DeploymentStatusResponse getDeploymentStatus(UUID deploymentId) {
        Deployment deployment = deploymentRepository.findById(deploymentId).orElseThrow(() -> new RuntimeException("Deployment not found"));
        DeploymentStatusResponse response = new DeploymentStatusResponse();
        response.setDeploymentId(deployment.getId());
        response.setStatus(deployment.getStatus());
        return response;
    }
}
