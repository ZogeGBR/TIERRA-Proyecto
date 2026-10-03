package com.tierra.ecommerce;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // necesario para ReservaStockLiberadorJob
public class TierraApplication {
    public static void main(String[] args) {
        SpringApplication.run(TierraApplication.class, args);
    }
}
