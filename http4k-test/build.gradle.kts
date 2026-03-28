plugins {
    application
    kotlin("jvm") version "2.3.10"
    // Add the Shadow plugin
    id("com.github.johnrengelman.shadow") version "8.1.1"
    id("org.graalvm.buildtools.native") version "0.10.4"
}

group = "org.hydev"
version = "1.0-SNAPSHOT"

application {
    mainClass = "org.hydev.MainKt"
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(kotlin("test"))
    implementation(platform("org.http4k:http4k-bom:6.38.0.0"))

    implementation("org.http4k:http4k-core")
    implementation("org.http4k:http4k-client-apache")
}

kotlin {
    jvmToolchain(21)
}

tasks.test {
    useJUnitPlatform()
}

graalvmNative {
    binaries {
        named("main") {
            imageName.set("http4k-test")
            mainClass.set("org.hydev.MainKt")
            buildArgs.add("--no-fallback")
        }
    }
    metadataRepository {
        enabled.set(true)
    }
}