pipeline {
    agent any

    // These environment variables are used throughout the pipeline
    environment {
        AWS_REGION         = 'us-east-1'
        ECR_REGISTRY       = '016963913530.dkr.ecr.us-east-1.amazonaws.com' // REPLACE THIS
        STATION_REPO       = 'chargemate/station-service'
        BOOKING_REPO       = 'chargemate/booking-service'
        EB_STATION_APP     = 'chargemate-station'
        EB_BOOKING_APP     = 'chargemate-booking'
        EB_STATION_ENV     = 'Chargemate-station-env' // check your EB env name
        EB_BOOKING_ENV     = 'Chargemate-booking-env'
        IMAGE_TAG          = "${env.BUILD_NUMBER}" // unique tag per build
    }

    stages {

        // STAGE 1: Get the code from GitHub
        stage('Checkout') {
            steps {
                echo 'Checking out source code from GitHub...'
                checkout scm
            }
        }

        // STAGE 2: Run unit tests for both services
        stage('Test') {
            parallel {
                stage('Test Station Service') {
                    steps {
                        dir('station-service') {
                            sh 'npm install'
                            sh 'npm test'
                        }
                    }
                }
                stage('Test Booking Service') {
                    steps {
                        dir('booking-service') {
                            sh 'npm install'
                            sh 'npm test'
                        }
                    }
                }
            }
        }

        // STAGE 3: Build Docker images
        stage('Build Docker Images') {
            steps {
                echo 'Building Docker images...'
                sh """
                    docker build -t ${ECR_REGISTRY}/${STATION_REPO}:${IMAGE_TAG} ./station-service
                    docker build -t ${ECR_REGISTRY}/${BOOKING_REPO}:${IMAGE_TAG} ./booking-service
                """
            }
        }

        // STAGE 4: Push images to AWS ECR
        stage('Push to ECR') {
            steps {
                withAWS(credentials: 'aws-credentials', region: "${AWS_REGION}") {
                    echo 'Logging in to ECR...'
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | \
                        docker login --username AWS --password-stdin ${ECR_REGISTRY}
                    """
                    echo 'Pushing station-service image...'
                    sh "docker push ${ECR_REGISTRY}/${STATION_REPO}:${IMAGE_TAG}"

                    echo 'Pushing booking-service image...'
                    sh "docker push ${ECR_REGISTRY}/${BOOKING_REPO}:${IMAGE_TAG}"
                }
            }
        }

        // STAGE 5: Deploy to Elastic Beanstalk
        stage('Deploy to Elastic Beanstalk') {
            steps {
                withAWS(credentials: 'aws-credentials', region: "${AWS_REGION}") {
                    echo 'Deploying station-service...'
                    sh """
                        # Write Dockerrun.aws.json for station service
                        cat > station-dockerrun.aws.json << EOF
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "${ECR_REGISTRY}/${STATION_REPO}:${IMAGE_TAG}",
    "Update": "true"
  },
  "Ports": [{"ContainerPort": "3001"}]
}
EOF
                        # Zip and upload to S3, then deploy
                        zip station-deploy.zip station-dockerrun.aws.json
                        aws s3 cp station-deploy.zip s3://elasticbeanstalk-${AWS_REGION}-\$(aws sts get-caller-identity --query Account --output text)/station-deploy-${IMAGE_TAG}.zip
                        aws elasticbeanstalk create-application-version \
                            --application-name ${EB_STATION_APP} \
                            --version-label v${IMAGE_TAG} \
                            --source-bundle S3Bucket=elasticbeanstalk-${AWS_REGION}-\$(aws sts get-caller-identity --query Account --output text),S3Key=station-deploy-${IMAGE_TAG}.zip
                        aws elasticbeanstalk update-environment \
                            --environment-name ${EB_STATION_ENV} \
                            --version-label v${IMAGE_TAG}
                    """

                    echo 'Deploying booking-service...'
                    sh """
                        cat > booking-dockerrun.aws.json << EOF
{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "${ECR_REGISTRY}/${BOOKING_REPO}:${IMAGE_TAG}",
    "Update": "true"
  },
  "Ports": [{"ContainerPort": "3002"}]
}
EOF
                        zip booking-deploy.zip booking-dockerrun.aws.json
                        aws s3 cp booking-deploy.zip s3://elasticbeanstalk-${AWS_REGION}-\$(aws sts get-caller-identity --query Account --output text)/booking-deploy-${IMAGE_TAG}.zip
                        aws elasticbeanstalk create-application-version \
                            --application-name ${EB_BOOKING_APP} \
                            --version-label v${IMAGE_TAG} \
                            --source-bundle S3Bucket=elasticbeanstalk-${AWS_REGION}-\$(aws sts get-caller-identity --query Account --output text),S3Key=booking-deploy-${IMAGE_TAG}.zip
                        aws elasticbeanstalk update-environment \
                            --environment-name ${EB_BOOKING_ENV} \
                            --version-label v${IMAGE_TAG}
                    """
                }
            }
        }

        // STAGE 6: Health check after deployment
        stage('Health Check') {
            steps {
                echo 'Waiting 60 seconds for deployment to settle...'
                sleep 60
                sh """
                    curl -f http://${EB_STATION_ENV}.${AWS_REGION}.elasticbeanstalk.com/health || exit 1
                    curl -f http://${EB_BOOKING_ENV}.${AWS_REGION}.elasticbeanstalk.com/health || exit 1
                """
                echo 'All services healthy!'
            }
        }
    }

    // ROLLBACK: runs automatically if any stage fails
    post {
        failure {
            withAWS(credentials: 'aws-credentials', region: "${AWS_REGION}") {
                echo 'PIPELINE FAILED — attempting rollback to previous version...'
                sh """
                    PREV_VERSION=\$(aws elasticbeanstalk describe-application-versions \
                        --application-name ${EB_STATION_APP} \
                        --query 'sort_by(ApplicationVersions, &DateCreated)[-2].VersionLabel' \
                        --output text)
                    if [ "\$PREV_VERSION" != "None" ] && [ -n "\$PREV_VERSION" ]; then
                        aws elasticbeanstalk update-environment \
                            --environment-name ${EB_STATION_ENV} \
                            --version-label \$PREV_VERSION
                        echo "Rolled back station-service to \$PREV_VERSION"
                    fi
                """
            }
        }
        success {
            echo 'Pipeline completed successfully! Both services deployed.'
        }
    }
}