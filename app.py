import os
import sys
import argparse
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from flask import Flask, render_template, request, redirect, url_for
from datetime import date
import psycopg2.extras

app = Flask(__name__)

DB_NAME = "cafe_v2_db"
DB_USER = "postgres"
DB_PASSWORD = "postgresql"
DB_HOST = "localhost"

def get_db_connection():
    return psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST)

def create_database():
    conn = psycopg2.connect(dbname="postgres", user=DB_USER, password=DB_PASSWORD, host=DB_HOST)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", (DB_NAME,))
    exists = cur.fetchone()
    if not exists:
        cur.execute(f"CREATE DATABASE {DB_NAME}")
    cur.close()
    conn.close()

def create_entries_table():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS entries (
            id SERIAL PRIMARY KEY,
            date DATE NOT NULL,
            entry_type TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            details TEXT,
            staff_name TEXT,
            balance NUMERIC(12,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    cur.close()
    conn.close()

def ensure_schema_updates():
    return
def clear_details():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("UPDATE entries SET details = NULL WHERE details IS NOT NULL")
    conn.commit()
    cur.close()
    conn.close()

def purge_imported_checking_entries():
    import csv, os
    conn = get_db_connection()
    cur = conn.cursor()
    csv_path = os.path.join(os.path.dirname(__file__), "checking_account_main.csv")
    try:
        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                date_str = row.get("date")
                description = row.get("description")
                category = row.get("category")
                t = (row.get("type") or "").lower()
                entry_type = "income" if t == "credit" else "expense"
                balance = row.get("balance")
                balance_val = float(balance) if balance not in (None, "") else None
                if date_str and description and category and balance_val is not None:
                    cur.execute(
                        """
                        DELETE FROM entries
                        WHERE date = %s
                          AND category = %s
                          AND description = %s
                          AND entry_type = %s
                          AND balance = %s
                          AND COALESCE(details,'') = ''
                          AND COALESCE(staff_name,'') = ''
                        """,
                        (date_str, category, description, entry_type, balance_val),
                    )
        conn.commit()
    except Exception:
        pass
    finally:
        cur.close()
        conn.close()
def reset_entries_from_dataset():
    import csv, os
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM entries")
    csv_path = os.path.join(os.path.dirname(__file__), "checking_account_main.csv")
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            date_str = row["date"]
            description = row["description"]
            category = row["category"]
            t = (row["type"] or "").lower()
            entry_type = "income" if t == "credit" else "expense"
            balance = float(row["balance"] or 0)
            cur.execute(
                """
                INSERT INTO entries (date, entry_type, category, description, balance)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (date_str, entry_type, category, description, balance),
            )
    conn.commit()
    cur.close()
    conn.close()
@app.route('/', methods=('GET', 'POST'))
def add_data():
    if request.method == 'POST':
        date_entry = request.form['date']
        entry_type = request.form['entry_type']
        category = request.form['category']
        description = request.form['description']
        details = request.form.get('details') or None
        balance = request.form['balance']
        staff_name = request.form['staff_name']
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO entries (date, entry_type, category, description, details, staff_name, balance)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (date_entry, entry_type, category, description, details, staff_name, balance),
        )
        conn.commit()
        cur.close()
        conn.close()
        return redirect(url_for('add_data'))
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    month = request.args.get('month')
    year = request.args.get('year')
    where = []
    params = []
    if year:
        where.append("EXTRACT(YEAR FROM date) = %s")
        params.append(int(year))
    if month:
        where.append("EXTRACT(MONTH FROM date) = %s")
        params.append(int(month))
    sql = "SELECT id, date, entry_type, category, description, details, staff_name, balance FROM entries"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY date DESC, id DESC"
    cur.execute(sql, params)
    rows = cur.fetchall()
    # Build description options per category from checking_account_main.csv dataset
    import csv, os
    csv_path = os.path.join(os.path.dirname(__file__), "checking_account_main.csv")
    cat_map = {}
    try:
        with open(csv_path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cat = row.get("category")
                desc = row.get("description")
                if not cat or not desc:
                    continue
                cat_map.setdefault(cat, set()).add(desc)
    except Exception:
        pass
    # Years for filters from existing entries
    cur.execute("SELECT DISTINCT EXTRACT(YEAR FROM date) AS y FROM entries ORDER BY y DESC")
    years_rows = cur.fetchall()
    cur.close()
    conn.close()
    categories_map = {k: sorted(list(v)) for k, v in cat_map.items()}
    total_income = sum(float(r["balance"]) for r in rows if r["entry_type"] == "income")
    total_expense = sum(float(r["balance"]) for r in rows if r["entry_type"] == "expense")
    available_years = [int(r["y"]) if isinstance(r, dict) else int(r[0]) for r in years_rows]
    selected_month = int(month) if month else None
    selected_year = int(year) if year else None
    return render_template(
        "add_data.html",
        today=date.today(),
        transactions=rows,
        total_income=total_income,
        total_expense=total_expense,
        categories_map=categories_map,
        available_years=available_years,
        selected_month=selected_month,
        selected_year=selected_year
    )

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--init-db', action='store_true')
    parser.add_argument('--clear-details', action='store_true')
    parser.add_argument('--reset-from-dataset', action='store_true')
    parser.add_argument('--purge-legacy', action='store_true')
    args = parser.parse_args()
    if args.init_db:
        create_database()
        create_entries_table()
        sys.exit(0)
    if args.clear_details:
        clear_details()
        sys.exit(0)
    if args.purge_legacy:
        purge_imported_checking_entries()
        sys.exit(0)
    if args.reset_from_dataset:
        reset_entries_from_dataset()
        sys.exit(0)
    ensure_schema_updates()
    app.run(debug=True, port=5001)
