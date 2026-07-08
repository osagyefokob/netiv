package com.logistics.common.security;

@FunctionalInterface
public interface TokenRevocationChecker {
    boolean isRevoked(String tokenId);
}