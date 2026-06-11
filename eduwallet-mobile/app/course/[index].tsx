// app/course/[index].tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useStudent } from "../../context/StudentContext";

/**
 * Detail screen for a single course.
 *
 * The route is `/course/[index]`, where `index` is the 0-based index
 * into `student.results` from the login payload. The screen reads the
 * index from the URL, looks up the corresponding result in the
 * StudentContext, and renders a read-only view.
 */
export default function CourseDetailsScreen() {
  const { index } = useLocalSearchParams<{ index?: string }>();
  const { data } = useStudent();

  // No student data at all – show a simple error message
  if (!data || !data.student || !data.student.results) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No student data available.</Text>
      </View>
    );
  }

  // Parse the dynamic route segment `[index]` into a number
  const courseIndex = index ? parseInt(index, 10) : NaN;
  const results = data.student.results;

  // Guard against malformed or out-of-range indices
  if (Number.isNaN(courseIndex) || courseIndex < 0 || courseIndex >= results.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No course data available.</Text>
      </View>
    );
  }

  const course = results[courseIndex];

  // Only show grade / evaluation date if we actually have non-empty values
  const hasGrade = typeof course.grade === "string" && course.grade.trim().length > 0;
  const hasEvaluationDate =
    typeof course.evaluationDate === "string" && course.evaluationDate.trim().length > 0;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{course.name}</Text>
      <Text style={styles.subtitle}>
        {course.degreeCourse} • {course.university.shortName}
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Course code</Text>
        <Text style={styles.value}>{course.code}</Text>

        <Text style={styles.label}>ECTS</Text>
        <Text style={styles.value}>{course.ects.toFixed(1)}</Text>

        {hasGrade && (
          <>
            <Text style={styles.label}>Grade</Text>
            <Text style={styles.value}>{course.grade}</Text>
          </>
        )}

        {hasEvaluationDate && (
          <>
            <Text style={styles.label}>Evaluation date</Text>
            <Text style={styles.value}>{course.evaluationDate}</Text>
          </>
        )}

        <Text style={styles.label}>University</Text>
        <Text style={styles.value}>{course.university.name}</Text>

        <Text style={styles.label}>Country</Text>
        <Text style={styles.value}>{course.university.country}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
    backgroundColor: "#0f1115",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#cccccc",
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    paddingTop: 4,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "#1a1d23",
  },
  label: {
    fontSize: 12,
    color: "#9fa9ff",
    marginTop: 10,
  },
  value: {
    fontSize: 14,
    color: "#ffffff",
    marginTop: 2,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
  },
});
