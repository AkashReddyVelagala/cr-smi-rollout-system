pipeline {
    agent any

    environment {
        BACKEND_IMAGE  = 'cr-smi-backend'
        FRONTEND_IMAGE = 'cr-smi-frontend'
        IMAGE_TAG      = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('1. Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('2. Backend Compile & Unit Tests') {
            steps {
                dir('backend/cr-smi-backend') {
                    sh 'mvn clean test -B'
                }
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'backend/cr-smi-backend/target/surefire-reports/*.xml'
                }
            }
        }

        stage('3. Frontend Lint & Production Build') {
            steps {
                dir('frontend/cr-smi-frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('4. Build Docker Images') {
            steps {
                sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest ./backend/cr-smi-backend"
                sh "docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${FRONTEND_IMAGE}:latest ./frontend/cr-smi-frontend"
            }
        }
    }

    post {
        success {
            echo "CI/CD Pipeline Passed! Images built: ${BACKEND_IMAGE}:${IMAGE_TAG} & ${FRONTEND_IMAGE}:${IMAGE_TAG}"
        }
        failure {
            echo "CI/CD Pipeline Failed — check stage logs above."
        }
    }
}