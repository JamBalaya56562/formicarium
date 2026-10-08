//! Test-only static guest; never included in the runtime package.
use std::{env, fs, io::{self, Write}, os::unix::{fs::{symlink, PermissionsExt, MetadataExt}}, thread, time::Duration};

fn main() {
    match env::args().nth(1).as_deref() {
        Some("bytes") => {
            io::stdout().write_all(&[0, 255, 128, 65, 10]).unwrap();
            io::stderr().write_all(&[254, 0, 66, 10]).unwrap();
            std::process::exit(3);
        }
        Some("seed") => {
            fs::create_dir_all("/work/kept").unwrap();
            fs::set_permissions("/work/kept", fs::Permissions::from_mode(0o700)).unwrap();
            fs::write("/work/kept/a", [0, 255, 42]).unwrap();
            fs::set_permissions("/work/kept/a", fs::Permissions::from_mode(0o640)).unwrap();
            fs::hard_link("/work/kept/a", "/work/kept/b").unwrap();
            symlink("a", "/work/kept/link").unwrap();
            fs::write("/work/deleted", b"remove me").unwrap();
            fs::remove_file("/work/deleted").unwrap();
            println!("seeded");
        }
        Some("verify") => {
            assert_eq!(fs::read("/work/kept/b").unwrap(), [0, 255, 42]);
            assert_eq!(fs::metadata("/work/kept/a").unwrap().ino(), fs::metadata("/work/kept/b").unwrap().ino());
            assert_eq!(fs::metadata("/work/kept/a").unwrap().mode() & 0o777, 0o640);
            assert_eq!(fs::metadata("/work/kept").unwrap().mode() & 0o777, 0o700);
            assert_eq!(fs::read_link("/work/kept/link").unwrap().to_str().unwrap(), "a");
            assert!(!std::path::Path::new("/work/deleted").exists());
            fs::write("/work/kept/b", [9, 8]).unwrap();
            assert_eq!(fs::read("/work/kept/a").unwrap(), [9, 8]);
            println!("verified");
        }
        Some("spin") => {
            println!("spin-started");
            io::stdout().flush().unwrap();
            loop { std::hint::spin_loop(); }
        }
        Some("thread-spin") => {
            thread::spawn(|| loop { std::hint::spin_loop(); });
            println!("thread-started");
            io::stdout().flush().unwrap();
            loop { thread::sleep(Duration::from_millis(10)); }
        }
        Some("thread-exit") => {
            let child = thread::spawn(|| println!("child-finished"));
            child.join().unwrap();
            println!("parent-finished");
        }
        _ => println!("fixture-ok"),
    }
}
