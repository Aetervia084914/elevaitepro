import json
import sys
sys.path.append('g:/elevaitepro/backend')
from app.db.session import SessionLocal
from sqlalchemy import text

with SessionLocal() as db:
    db.execute(
        text(
            """
            INSERT INTO user_cv_upload (
                session_id, candidate_id, filename, content_type, file_size, content_hash,
                raw_text, work_experience, education, contact_info, sections, sections_found,
                warnings, years_of_experience, location, future_roles_data,
                tools_and_technologies, core_skills, certifications
            ) VALUES (
                :session_id, CAST(:candidate_id AS uuid), :filename, :content_type, :file_size,
                :content_hash, :raw_text, CAST(:work_experience AS jsonb), :education,
                CAST(:contact_info AS jsonb), CAST(:sections AS jsonb), CAST(:sections_found AS jsonb),
                CAST(:warnings AS jsonb), :years_of_experience, :location,
                CAST(:future_roles_data AS jsonb), CAST(:tools_and_technologies AS jsonb),
                CAST(:core_skills AS jsonb), CAST(:certifications AS jsonb)
            )
            """
        ),
        {
            'session_id': 'repro-test-session',
            'candidate_id': 'f5205a6a-d51e-47fe-be37-1bc5fe1cfed7',
            'filename': 'test.pdf',
            'content_type': 'application/pdf',
            'file_size': 1,
            'content_hash': 'abc',
            'raw_text': 'test',
            'work_experience': json.dumps({'formatted_text': '', 'entries': []}),
            'education': '',
            'contact_info': json.dumps({}),
            'sections': json.dumps({}),
            'sections_found': json.dumps([]),
            'warnings': json.dumps([]),
            'years_of_experience': None,
            'location': 'UK',
            'future_roles_data': json.dumps({'roles': ['AI Engineer']}),
            'tools_and_technologies': json.dumps({'Python': 'Programming Language'}),
            'core_skills': json.dumps({'Python': 'Technical'}),
            'certifications': json.dumps([]),
        },
    )
    db.commit()
    print('insert ok')
