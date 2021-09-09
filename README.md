# season-scheduler

Schedule a season.

## Deployment to Azure

Deploy the app to azure:

    npm build
    cd dist/season-scheduler

    az login
    az account set -s <subscriptionId>
    az webapp up --location westeurope --name season-scheduler --html --sku FREE --resource-group sample-web-apps-rg
