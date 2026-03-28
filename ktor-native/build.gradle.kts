val kotlin_version: String by project
val ktor_version: String by project

plugins {
    kotlin("multiplatform") version "2.3.0"
    id("io.ktor.plugin") version "3.4.1"
}

group = "org.hydev"
version = "0.0.1"

kotlin {
    mingwX64("native") {
        binaries {
            executable {
                entryPoint = "org.hydev.main"
            }
        }
    }

    sourceSets {
        val nativeMain by getting {
            dependencies {
                implementation("io.ktor:ktor-server-core:$ktor_version")
                implementation("io.ktor:ktor-server-cio:$ktor_version")
            }
        }
        val nativeTest by getting
    }
}
