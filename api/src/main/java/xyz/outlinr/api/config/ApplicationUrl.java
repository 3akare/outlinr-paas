package xyz.outlinr.api.config;

public interface ApplicationUrl {
    String BASE_AUTH_URL = "/api/auth";
    String REFRESH_TOKEN = "/refresh";
    String LOGOUT = "/logout";

    String BASE_GITHUB_URL = "/api/github";
    String INSTALLATION_CALLBACK = "/installation/callback";
    String INSTALLATION_SAVE = "/installation/save";
    String REPOSITORY_LIST = "/repository/list";

    String BASE_USER_URL = "/api/user";
    String USER_PROFILE = "/profile";

    String BASE_DEPLOY_URL = "/api/apps";
    String DEPLOY_APP = "/deploy";
    String CHECK_NAME = "/check-name";
    String VALIDATE_REPO = "/validate-repo";
    String DEPLOYMENT_STATUS = "/deployments/{deploymentId}/status";
}
