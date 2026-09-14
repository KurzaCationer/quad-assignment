package nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models;

import java.util.List;

public class QuestionAndAnswersDTO {
    public QuestionType type;
    public QuestionDifficulty difficulty;
    public String category;
    public String question;
    public String correct_answer;
    public List<String> incorrect_answers;
}
