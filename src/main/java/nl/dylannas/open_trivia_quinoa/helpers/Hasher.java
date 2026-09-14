package nl.dylannas.open_trivia_quinoa.helpers;

import nl.dylannas.open_trivia_quinoa.models.QuestionAndAnswerModel;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.HexFormat;
import java.util.Locale;

public final class Hasher {
    private Hasher() {}

    public static String hashQuestionsAndAnswersModel(QuestionAndAnswerModel model) {
        var normalizedString = Normalizer.normalize(model.question, Normalizer.Form.NFC)
                .strip()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] bytes = digest.digest(normalizedString.getBytes(StandardCharsets.UTF_8));

            return HexFormat.of().formatHex(bytes);

        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}