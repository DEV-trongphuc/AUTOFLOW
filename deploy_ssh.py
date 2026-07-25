# d:\GITHUB_SPACE\DOMATION_FULLSTACK\deploy_ssh.py
import os
import tarfile
import subprocess
import tempfile

def main():
    temp_dir = tempfile.gettempdir()
    archive_path = os.path.join(temp_dir, "autoflow_backend.tar.gz")
    
    print("1. Creating tar.gz archive from local 'api' directory...")
    try:
        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add("api", arcname=".")
        print(f"Archive created at {archive_path}")
    except Exception as e:
        print(f"Error creating archive: {e}")
        return

    print("2. Uploading and extracting to remote cPanel directory...")
    ssh_cmd = [
        "ssh", "-4", "-p", "2210", 
        "-o", "StrictHostKeyChecking=no", 
        "vhvxoigh@chiefaiofficer.vn", 
        "tar -xzf - -C /home/vhvxoigh/automation.ideas.edu.vn/mail_api/"
    ]
    
    try:
        with open(archive_path, "rb") as stdin_f:
            result = subprocess.run(
                ssh_cmd, 
                stdin=stdin_f, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                text=True
            )
        
        if result.returncode == 0:
            print("SSH deployment completed successfully!")
            if result.stdout:
                print(f"STDOUT:\n{result.stdout}")
        else:
            print(f"SSH deployment failed with exit code: {result.returncode}")
            if result.stderr:
                print(f"STDERR:\n{result.stderr}")
    except Exception as e:
        print(f"Error executing SSH command: {e}")
    finally:
        if os.path.exists(archive_path):
            os.remove(archive_path)
            print("Temporary archive cleaned up.")

if __name__ == '__main__':
    main()
