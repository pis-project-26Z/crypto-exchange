pipeline {
    agent none

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        // A new push to the same PR/branch cancels the build that's still running
        disableConcurrentBuilds(abortPrevious: true)
        timestamps()
    }

    stages {
        stage('Build') {
            parallel {
                stage('Backend') {
                    options {
                        timeout(time: 30, unit: 'MINUTES')
                    }
                    agent {
                        docker { image 'eclipse-temurin:25-jdk' }
                    }
                    environment {
                        // The container has no writable $HOME, so keep Gradle's cache in the workspace
                        GRADLE_USER_HOME = "${WORKSPACE}/.gradle-home"
                    }
                    steps {
                        dir('backend') {
                            sh './gradlew build --no-daemon'
                        }
                        stash name: 'backend-sonar', includes: 'backend/build/classes/java/main/**,backend/build/reports/jacoco/test/jacocoTestReport.xml'
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'backend/build/test-results/test/*.xml'
                            archiveArtifacts artifacts: 'backend/build/reports/tests/**,backend/build/reports/jacoco/**', allowEmptyArchive: true
                        }
                        success {
                            script {
                                if (env.BRANCH_NAME == 'main') {
                                    archiveArtifacts artifacts: 'backend/build/libs/*.jar', fingerprint: true
                                }
                            }
                        }
                    }
                }

                stage('Frontend') {
                    options {
                        timeout(time: 30, unit: 'MINUTES')
                    }
                    agent {
                        docker { image 'node:26-alpine' }
                    }
                    environment {
                        npm_config_cache = "${WORKSPACE}/.npm-cache"
                    }
                    steps {
                        dir('frontend') {
                            sh 'npm ci --ignore-scripts'
                            sh 'npm run lint'
                            sh 'npm run test:coverage'
                            sh 'npm run build'
                        }
                        stash name: 'frontend-sonar', includes: 'frontend/coverage/lcov.info'
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'frontend/test-results/junit.xml'
                            archiveArtifacts artifacts: 'frontend/coverage/**,frontend/test-results/**', allowEmptyArchive: true
                        }
                        success {
                            script {
                                if (env.BRANCH_NAME == 'main') {
                                    archiveArtifacts artifacts: 'frontend/dist/**', fingerprint: true
                                }
                            }
                        }
                    }
                }
            }
        }

        stage('Sonar') {
            options {
                timeout(time: 15, unit: 'MINUTES')
            }
            agent {
                docker {
                    image 'sonarsource/sonar-scanner-cli:12.4'
                    // The image's entrypoint would run the scanner straight away; we call it ourselves
                    args '--entrypoint='
                }
            }
            environment {
                SONAR_TOKEN = credentials('sonar-token')
                SONAR_HOST_URL = 'https://sonarcloud.io'
            }
            steps {
                unstash 'backend-sonar'
                unstash 'frontend-sonar'
                script {
                    // Tell Sonar whether this is a PR or a branch, so it compares against the right base
                    def target = env.CHANGE_ID
                        ? "-Dsonar.pullrequest.key=${env.CHANGE_ID} -Dsonar.pullrequest.branch=${env.CHANGE_BRANCH} -Dsonar.pullrequest.base=${env.CHANGE_TARGET}"
                        : "-Dsonar.branch.name=${env.BRANCH_NAME}"
                    sh "sonar-scanner ${target}"
                }
            }
        }
    }
}
