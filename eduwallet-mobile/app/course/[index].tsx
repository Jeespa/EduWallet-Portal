// app/course/[index].tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStudent } from "../context/StudentContext";

export default function CourseDetailsScreen() {
  const router = useRouter();
  const { index } = useLocalSearchParams<{ index?: string }>();
  const { data } = useStudent();

  // No student data at all
  if (!data || !data.student || !data.student.results) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No student data available.</Text>
      </View>
    );
  }

  // Parse course index
  const courseIndex = index ? parseInt(index, 10) : NaN;
  const results = data.student.results;

  if (
    Number.isNaN(courseIndex) ||
    courseIndex < 0 ||
    courseIndex >= results.length
  ) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No course data available.</Text>
      </View>
    );
  }

  const course = results[courseIndex];

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

        <Text style={styles.label}>Grade</Text>
        <Text style={styles.value}>{course.grade ?? "-"}</Text>

        <Text style={styles.label}>Evaluation date</Text>
        <Text style={styles.value}>{course.evaluationDate ?? "-"}</Text>

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
    paddingVertical: 16,
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
