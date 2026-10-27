import {type Dispatch, type SetStateAction, useState} from "react";
import type {QuestionDifficulty, QuestionType} from "@/generated/api.schemas.ts";

interface QuizSearch {
    shouldFetch: boolean;
    category: number;
    difficulty: QuestionDifficulty;
    type: QuestionType;
}

interface UseQuizFiltersOptions {
    search: QuizSearch;
    navigate: (options: {search: (previous: QuizSearch) => QuizSearch}) => Promise<void>;
    onChange: () => void;
}

export function useQuizFilters({search, navigate, onChange}: UseQuizFiltersOptions) {
    const {category, shouldFetch, difficulty, type} = search;

    const [shouldFetchDisplay, setShouldFetchDisplay] = useState(shouldFetch);
    const [categoryDisplay, setCategoryDisplay] = useState(category);
    const [difficultyDisplay, setDifficultyDisplay] = useState(difficulty)
    const [typeDisplay, setTypeDisplay] = useState(type);

    const setSearchParameter = async <K extends keyof QuizSearch>(
        key: K,
        valueOrAction: SetStateAction<QuizSearch[K]>
    ) => {
        onChange();

        const setters: {
            [P in keyof QuizSearch]: Dispatch<SetStateAction<QuizSearch[P]>>
        } = {
            shouldFetch: setShouldFetchDisplay,
            category: setCategoryDisplay,
            difficulty: setDifficultyDisplay,
            type: setTypeDisplay,
        };

        setters[key](valueOrAction);
        await navigate({
            search: (prev) => ({
                ...prev,
                [key]: typeof valueOrAction === "function" ? valueOrAction(prev[key]) : valueOrAction
            })
        });
    };

    const toggleShouldFetch = async () => {
        await setSearchParameter("shouldFetch", prev => !prev);
    }

    const anySearchParameterChanging = (category !== categoryDisplay) || (shouldFetch !== shouldFetchDisplay) ||
        (difficultyDisplay !== difficulty) || (typeDisplay !== type);

    return {
        shouldFetch: shouldFetchDisplay,
        category: categoryDisplay,
        difficulty: difficultyDisplay,
        type: typeDisplay,
        isChanging: anySearchParameterChanging,
        setSearchParameter,
        toggleShouldFetch,
    };
}
