package com.wms.wmsbackend.aspect;
import com.wms.wmsbackend.annotation.Idempotent;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.context.request.*;

@Aspect
@Component
public class IdempotentAspect {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transactions;
    private final ObjectMapper json;
    public IdempotentAspect(JdbcTemplate jdbc, org.springframework.transaction.PlatformTransactionManager manager, ObjectMapper json) {
        this.jdbc=jdbc; this.transactions=new TransactionTemplate(manager); this.json=json;
    }
    @Around("@annotation(idempotent)")
    public Object checkIdempotent(ProceedingJoinPoint call, Idempotent idempotent) throws Throwable {
        HttpServletRequest req = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        String key=req.getHeader("Idempotency-Key");
        // Existing API callers remain compatible; new clients use an explicit operation key.
        if (key == null || key.isBlank()) return call.proceed();
        if (!key.matches("[a-zA-Z0-9_-]{1,80}")) throw new IllegalArgumentException("Invalid Idempotency-Key");
        String requestKey=req.getUserPrincipal().getName()+":"+req.getRequestURI()+":"+key;
        String hash=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
            .digest(json.writeValueAsBytes(call.getArgs())));
        return transactions.execute(status -> {
            jdbc.queryForObject("SELECT id FROM wms_system_lock WHERE id=1 FOR UPDATE", Integer.class);
            var existing=jdbc.queryForList("SELECT request_hash, response_body FROM wms_request WHERE request_key=?",requestKey);
            if (!existing.isEmpty()) {
                if (!hash.equals(existing.get(0).get("request_hash"))) throw new ResponseStatusException(HttpStatus.CONFLICT,"同一操作标识不能用于不同内容。");
                return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(existing.get(0).get("response_body"));
            }
            try {
                Object result=call.proceed();
                Object body=result instanceof ResponseEntity<?> response ? response.getBody() : result;
                jdbc.update("INSERT INTO wms_request(request_key,request_hash,response_body) VALUES(?,?,?)",requestKey,hash,json.writeValueAsString(body));
                return result;
            } catch (RuntimeException | Error e) { throw e; }
            catch (Throwable e) { throw new IllegalStateException(e); }
        });
    }
}