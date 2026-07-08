package com.logistics.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

public class PasetoAuthenticationFilter extends OncePerRequestFilter {

    private final PasetoTokenParser parser;
    private final TokenRevocationChecker revocationChecker;

    public PasetoAuthenticationFilter(PasetoTokenParser parser) {
        this(parser, tokenId -> false);
    }

    public PasetoAuthenticationFilter(PasetoTokenParser parser, TokenRevocationChecker revocationChecker) {
        this.parser = parser;
        this.revocationChecker = revocationChecker;
    }

    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
            if (auth != null && auth.startsWith("Bearer ")) {
                String compact = auth.substring(7).trim();
                if (!compact.isEmpty()) {
                    ParsedPasetoToken parsed = parser.parse(compact);
                    if (parsed.tokenId() != null && revocationChecker.isRevoked(parsed.tokenId())) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        return;
                    }
                    LogisticsSecurityUser principal = new LogisticsSecurityUser(parsed);
                    UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);

                    UUID effective = EffectiveCompanyResolver.resolve(principal, request);
                    LogisticsTenantContext.setCompanyId(effective);
                }
            }
            if (LogisticsTenantContext.getCompanyId() == null) {
                LogisticsTenantContext.setCompanyId(DemoCompany.ID);
            }
            filterChain.doFilter(request, response);
        } finally {
            LogisticsTenantContext.clear();
        }
    }
}