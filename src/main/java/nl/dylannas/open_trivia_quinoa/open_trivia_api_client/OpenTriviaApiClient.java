package nl.dylannas.open_trivia_quinoa.open_trivia_api_client;

import com.github.benmanes.caffeine.cache.AsyncCache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bucket;
import io.smallrye.mutiny.Uni;
import io.smallrye.mutiny.unchecked.Unchecked;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.*;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.resteasy.reactive.RestResponse;

import java.time.Duration;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.function.Supplier;

@ApplicationScoped
public class OpenTriviaApiClient {
    private static final Duration RATE_LIMIT = Duration.ofSeconds(5);

    @Inject
    @RestClient
    OpenTriviaApiClientBase client;

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    private final Bucket rateLimiter;
    private final Set<CompletableFuture<?>> pendingCalls = ConcurrentHashMap.newKeySet();
    private boolean closed;

    private final AsyncCache<QuestionQuery, RestResponse<GetQuestionsAndAnswersDTO>> questionsCache;

    private final AsyncCache<String, RestResponse<GetCategoriesDTO>> categoriesCache = Caffeine.newBuilder()
            .maximumSize(1)
            .buildAsync();

    OpenTriviaApiClient() {
        rateLimiter = Bucket.builder().addLimit(limit -> limit.capacity(1).refillGreedy(1, RATE_LIMIT)).build();
        questionsCache = Caffeine.newBuilder().expireAfterWrite(RATE_LIMIT).maximumSize(1000).buildAsync();
    }

    private record QuestionQuery(Integer amount, QuestionDifficulty difficulty, QuestionType type,
                                 QuestionEncoding encoding, Integer categoryId) {
    }

    public Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(Integer amount) {
        return getQuestionsAndAnswers(amount, null, null, null, null);
    }

    public Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(Integer amount,
                                                                               QuestionDifficulty difficulty) {

        return getQuestionsAndAnswers(amount, difficulty, null, null, null);
    }

    public Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(Integer amount, QuestionType type) {

        return getQuestionsAndAnswers(amount, null, type, null, null);
    }

    public Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(Integer amount,
                                                                               QuestionDifficulty difficulty,
                                                                               QuestionType type) {

        return getQuestionsAndAnswers(amount, difficulty, type, null, null);
    }

    public Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(Integer amount,
                                                                               QuestionDifficulty difficulty,
                                                                               QuestionType type,
                                                                               Integer categoryId) {

        return getQuestionsAndAnswers(amount, difficulty, type, null, categoryId);
    }

    public Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(Integer amount,
                                                                               QuestionDifficulty difficulty,
                                                                               QuestionType type,
                                                                               QuestionEncoding encoding) {

        return getQuestionsAndAnswers(amount, difficulty, type, encoding, null);
    }

    public Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(Integer amount,
                                                                               QuestionDifficulty difficulty,
                                                                               QuestionType type,
                                                                               QuestionEncoding encoding,
                                                                               Integer categoryId) {

        QuestionQuery query = new QuestionQuery(amount, difficulty, type, encoding, categoryId);

        return Uni.createFrom()
                .completionStage(() -> questionsCache.get(query,
                        (key, executor) -> rateLimitedCall(() -> client.getQuestionsAndAnswers(key.amount(),
                                key.difficulty(),
                                key.type(),
                                key.encoding(),
                                key.categoryId()).onItem().invoke(Unchecked.consumer(response -> {
                            validateResponse(response);
                            var body = response.getEntity();
                            if (body == null) {
                                throw new IllegalStateException("OpenTDB returned an empty questions response");
                            }
                            if (body.response_code != 0) {
                                throw new IllegalStateException("OpenTDB returned response code " + body.response_code);
                            }
                            if (body.results == null) {
                                throw new IllegalStateException("OpenTDB returned no questions list");
                            }
                        })))).copy());
    }

    public Uni<RestResponse<GetCategoriesDTO>> getCategories() {
        return Uni.createFrom()
                .completionStage(() -> categoriesCache.get("categories",
                        (key, executor) -> rateLimitedCall(() -> client.getCategories()
                                .onItem()
                                .invoke(Unchecked.consumer(response -> {
                                    validateResponse(response);
                                    if (response.getEntity() == null || response.getEntity().trivia_categories == null) {
                                        throw new IllegalStateException("OpenTDB returned no categories list");
                                    }
                                })))).copy());
    }

    private synchronized <T> CompletableFuture<RestResponse<T>> rateLimitedCall(Supplier<Uni<RestResponse<T>>> request) {
        if (closed) {
            return CompletableFuture.failedFuture(new IllegalStateException("OpenTDB client is shut down"));
        }
        var result = rateLimiter.asScheduler()
                .consume(1, scheduler)
                .thenCompose(ignored -> request.get().subscribeAsCompletionStage());
        pendingCalls.add(result);
        result.whenComplete((response, failure) -> pendingCalls.remove(result));
        return result;
    }

    private static void validateResponse(RestResponse<?> response) {
        if (response == null) {
            throw new IllegalStateException("OpenTDB returned no response");
        }
        if (response.getStatus() < 200 || response.getStatus() >= 300) {
            throw new IllegalStateException("OpenTDB returned HTTP " + response.getStatus());
        }
    }

    public void invalidateQuestionsCache() {
        questionsCache.synchronous().invalidateAll();
    }

    public void invalidateCategoriesCache() {
        categoriesCache.synchronous().invalidateAll();
    }

    @PreDestroy
    synchronized void shutdown() {
        closed = true;
        scheduler.shutdownNow();
        pendingCalls.forEach(call -> call.completeExceptionally(new IllegalStateException("OpenTDB client is shut down")));
    }
}
