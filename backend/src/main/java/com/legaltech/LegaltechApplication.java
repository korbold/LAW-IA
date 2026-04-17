package com.legaltech;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class LegaltechApplication {

    public static void main(String[] args) {
        SpringApplication.run(LegaltechApplication.class, args);
    }
}
