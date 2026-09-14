package nl.dylannas.open_trivia_quinoa.models;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.hibernate.annotations.Generated;

import java.util.List;
import java.util.UUID;

@Entity
@Table(
        uniqueConstraints = @UniqueConstraint(
                name = "uk_question_hash",
                columnNames = {"question_hash", "question"}
        )
)
public class QuestionAndAnswerModel extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;

    public QuestionType type;
    public QuestionDifficulty difficulty;
    public Integer category;

    public String question;
    @Column(name = "question_hash", insertable = false, updatable = false)
    @Generated
    public String question_hash;

    public String correct_answer;
    public List<String> incorrect_answers;
}
