"""Standalone verification for the Admission Agent tool functions.

Not part of the application — run directly to confirm each tool works
against the live database before wiring them into the chat endpoint.

Run from the backend/ directory:
    uv run python verify_agent_tools.py
"""

from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from backend.agent import tools  # noqa: E402


def main() -> None:
    print("=" * 72)
    print("Tool schemas registered in TOOLS:")
    for entry in tools.TOOLS:
        fn = entry["function"]
        print(f"  - {fn['name']}: {fn['description'][:60]}...")

    print("=" * 72)
    print("\n[1] search_courses('adult tajweed recitation')")
    print(tools.search_courses("adult tajweed recitation"))

    print("\n[2a] get_course_details('Quran Reading for Beginners')")
    print(tools.get_course_details("Quran Reading for Beginners"))

    print("\n[2b] get_course_details('does-not-exist course')  [not found]")
    print(tools.get_course_details("does-not-exist course"))

    print("\n[3a] get_course_fee('Quran with Tajweed & Tarteel')")
    print(tools.get_course_fee("Quran with Tajweed & Tarteel"))

    print("\n[3b] get_course_fee('does-not-exist course')  [not found]")
    print(tools.get_course_fee("does-not-exist course"))

    print("\n[4] get_trial_info()")
    print(tools.get_trial_info())

    print("\n[5] get_registration_link()")
    print(tools.get_registration_link())

    print("\n[6] route_to_whatsapp('visitor wants to register')")
    print(tools.route_to_whatsapp("visitor wants to register"))

    print("\n" + "=" * 72)
    print("All tool functions executed.")


if __name__ == "__main__":
    main()
