/* ============================================================
   جنگ سلسله — نصب‌کننده و اجراکننده ویندوز
   (یک فایل exe: نصب، ساخت میان‌بر، اجرا، و حذف)
   ============================================================ */

#define WIN32_LEAN_AND_MEAN
#define COBJMACROS
#include <windows.h>
#include <shlobj.h>
#include <shobjidl.h>
#include <shellapi.h>
#include <strsafe.h>
#include <objbase.h>
#include <stdlib.h>
#include <string.h>

typedef struct { const char *name; const unsigned char *data; unsigned int size; } EmbFile;
#include "embedded.c"

#define APP_NAME_W L"\u062C\u0646\u06AF \u0633\u0644\u0633\u0644\u0647"   /* جنگ سلسله */
#define APP_DIR_W   L"JangSelseleh"
#define EXE_NAME_W  L"JangSelseleh.exe"
#define GAME_SUBDIR L"game"
#define UNINSTALL_KEY L"Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\JangSelseleh"

static void msg(const wchar_t *text, UINT type) {
    MessageBoxW(NULL, text, APP_NAME_W, type | MB_SETFOREGROUND);
}

static void copy_wide(wchar_t *dst, size_t cap, const wchar_t *src) {
    if (cap == 0) return;
    size_t i = 0;
    while (i + 1 < cap && src[i]) { dst[i] = src[i]; i++; }
    dst[i] = 0;
}

static void get_known_folder(REFKNOWNFOLDERID id, wchar_t *out, size_t cap) {
    PWSTR p = NULL;
    if (SUCCEEDED(SHGetKnownFolderPath(id, KF_FLAG_CREATE, NULL, &p)) && p) {
        copy_wide(out, cap, p);
        CoTaskMemFree(p);
    } else {
        out[0] = 0;
    }
}

static void path_join(wchar_t *out, size_t cap, const wchar_t *a, const wchar_t *b) {
    StringCchPrintfW(out, cap, L"%s\\%s", a, b);
}

static void ensure_dir(const wchar_t *dir) {
    wchar_t tmp[MAX_PATH];
    copy_wide(tmp, MAX_PATH, dir);
    for (wchar_t *p = tmp; *p; p++) {
        if (*p == L'\\') {
            *p = 0;
            CreateDirectoryW(tmp, NULL);
            *p = L'\\';
        }
    }
    CreateDirectoryW(tmp, NULL);
}

static int extract_files(const wchar_t *gameDir) {
    ensure_dir(gameDir);
    for (unsigned int i = 0; i < EMBEDDED_COUNT; i++) {
        const EmbFile *f = &EMBEDDED[i];
        wchar_t rel[MAX_PATH];
        int n = 0;
        for (const char *c = f->name; *c && n < MAX_PATH - 1; c++, n++)
            rel[n] = (*c == '/') ? L'\\' : (wchar_t)(unsigned char)*c;
        rel[n] = 0;

        wchar_t full[MAX_PATH];
        path_join(full, MAX_PATH, gameDir, rel);
        wchar_t parent[MAX_PATH];
        copy_wide(parent, MAX_PATH, full);
        wchar_t *slash = wcsrchr(parent, L'\\');
        if (slash) { *slash = 0; ensure_dir(parent); }

        HANDLE h = CreateFileW(full, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
        if (h == INVALID_HANDLE_VALUE) return 0;
        DWORD written = 0;
        WriteFile(h, f->data, f->size, &written, NULL);
        CloseHandle(h);
    }
    return 1;
}

static void create_shortcut(const wchar_t *linkPath, const wchar_t *target, const wchar_t *workDir, const wchar_t *desc) {
    IShellLinkW *sl = NULL;
    if (FAILED(CoCreateInstance(&CLSID_ShellLink, NULL, CLSCTX_INPROC_SERVER, &IID_IShellLinkW, (void**)&sl)) || !sl) return;
    sl->lpVtbl->SetPath(sl, target);
    sl->lpVtbl->SetWorkingDirectory(sl, workDir);
    sl->lpVtbl->SetDescription(sl, desc);
    IPersistFile *pf = NULL;
    if (SUCCEEDED(sl->lpVtbl->QueryInterface(sl, &IID_IPersistFile, (void**)&pf)) && pf) {
        pf->lpVtbl->Save(pf, linkPath, TRUE);
        pf->lpVtbl->Release(pf);
    }
    sl->lpVtbl->Release(sl);
}

static int find_edge(wchar_t *out, size_t cap) {
    static const wchar_t *candidates[] = {
        L"%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe",
        L"%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe",
        L"%LOCALAPPDATA%\\Microsoft\\Edge\\Application\\msedge.exe",
    };
    for (int i = 0; i < 3; i++) {
        wchar_t p[MAX_PATH];
        ExpandEnvironmentStringsW(candidates[i], p, MAX_PATH);
        if (GetFileAttributesW(p) != INVALID_FILE_ATTRIBUTES) {
            copy_wide(out, cap, p);
            return 1;
        }
    }
    return 0;
}

static void launch_game(const wchar_t *indexPath) {
    wchar_t edge[MAX_PATH];
    if (find_edge(edge, MAX_PATH)) {
        wchar_t url[MAX_PATH * 2];
        StringCchPrintfW(url, MAX_PATH * 2, L"file:///");
        size_t len = wcslen(url);
        for (const wchar_t *c = indexPath; *c && len < MAX_PATH * 2 - 4; c++) {
            if (*c == L'\\') url[len++] = L'/';
            else if (*c == L' ') { url[len++] = L'%'; url[len++] = L'2'; url[len++] = L'0'; }
            else url[len++] = *c;
        }
        url[len] = 0;
        wchar_t cmd[MAX_PATH * 3];
        StringCchPrintfW(cmd, MAX_PATH * 3, L"\"%s\" --app=\"%s\" --window-size=1360,860", edge, url);
        STARTUPINFOW si; PROCESS_INFORMATION pi;
        ZeroMemory(&si, sizeof(si)); si.cb = sizeof(si);
        ZeroMemory(&pi, sizeof(pi));
        if (CreateProcessW(NULL, cmd, NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
            CloseHandle(pi.hThread);
            CloseHandle(pi.hProcess);
            return;
        }
    }
    ShellExecuteW(NULL, L"open", indexPath, NULL, NULL, SW_SHOWNORMAL);
}

static void do_uninstall(void) {
    wchar_t desktop[MAX_PATH], programs[MAX_PATH], localAppData[MAX_PATH];
    get_known_folder(&FOLDERID_Desktop, desktop, MAX_PATH);
    get_known_folder(&FOLDERID_Programs, programs, MAX_PATH);
    get_known_folder(&FOLDERID_LocalAppData, localAppData, MAX_PATH);

    wchar_t link1[MAX_PATH], link2[MAX_PATH];
    path_join(link1, MAX_PATH, desktop, APP_NAME_W L".lnk");
    path_join(link2, MAX_PATH, programs, APP_NAME_W L".lnk");
    DeleteFileW(link1);
    DeleteFileW(link2);

    wchar_t dir[MAX_PATH];
    path_join(dir, MAX_PATH, localAppData, APP_DIR_W);
    wchar_t buf[MAX_PATH + 2];
    copy_wide(buf, MAX_PATH + 2, dir);
    buf[wcslen(buf) + 1] = 0;

    SHFILEOPSTRUCTW op;
    ZeroMemory(&op, sizeof(op));
    op.wFunc = FO_DELETE;
    op.pFrom = buf;
    op.fFlags = FOF_NOCONFIRMATION | FOF_SILENT | FOF_NOERRORUI;
    SHFileOperationW(&op);

    RegDeleteKeyW(HKEY_CURRENT_USER, UNINSTALL_KEY);
    msg(L"\u0628\u0627\u0632\u06CC \u062D\u0630\u0641 \u0634\u062F.", MB_ICONINFORMATION);
}

static void do_install(const wchar_t *selfPath) {
    wchar_t localAppData[MAX_PATH], installDir[MAX_PATH], gameDir[MAX_PATH], exePath[MAX_PATH];
    get_known_folder(&FOLDERID_LocalAppData, localAppData, MAX_PATH);
    path_join(installDir, MAX_PATH, localAppData, APP_DIR_W);
    path_join(gameDir, MAX_PATH, installDir, GAME_SUBDIR);
    path_join(exePath, MAX_PATH, installDir, EXE_NAME_W);
    ensure_dir(installDir);

    if (!extract_files(gameDir)) {
        msg(L"\u062E\u0637\u0627 \u062F\u0631 \u0646\u0635\u0628 \u0641\u0627\u06CC\u0644\u200C\u0647\u0627!", MB_ICONERROR);
        return;
    }

    CopyFileW(selfPath, exePath, FALSE);

    wchar_t desktop[MAX_PATH], programs[MAX_PATH];
    get_known_folder(&FOLDERID_Desktop, desktop, MAX_PATH);
    get_known_folder(&FOLDERID_Programs, programs, MAX_PATH);
    wchar_t link1[MAX_PATH], link2[MAX_PATH];
    path_join(link1, MAX_PATH, desktop, APP_NAME_W L".lnk");
    path_join(link2, MAX_PATH, programs, APP_NAME_W L".lnk");
    create_shortcut(link1, exePath, installDir, L"\u0628\u0627\u0632\u06CC \u0627\u0633\u062A\u0631\u0627\u062A\u0698\u06CC \u0641\u062A\u062D \u062C\u0647\u0627\u0646");
    create_shortcut(link2, exePath, installDir, L"\u0628\u0627\u0632\u06CC \u0627\u0633\u062A\u0631\u0627\u062A\u0698\u06CC \u0641\u062A\u062D \u062C\u0647\u0627\u0646");

    HKEY hk = NULL;
    if (RegCreateKeyExW(HKEY_CURRENT_USER, UNINSTALL_KEY, 0, NULL, 0, KEY_WRITE, NULL, &hk, NULL) == ERROR_SUCCESS) {
        wchar_t uninstall[MAX_PATH * 2];
        StringCchPrintfW(uninstall, MAX_PATH * 2, L"\"%s\" --uninstall", exePath);
        DWORD one = 1;
        RegSetValueExW(hk, L"DisplayName", 0, REG_SZ, (const BYTE*)APP_NAME_W, (DWORD)((wcslen(APP_NAME_W) + 1) * sizeof(wchar_t)));
        RegSetValueExW(hk, L"UninstallString", 0, REG_SZ, (const BYTE*)uninstall, (DWORD)((wcslen(uninstall) + 1) * sizeof(wchar_t)));
        RegSetValueExW(hk, L"InstallLocation", 0, REG_SZ, (const BYTE*)installDir, (DWORD)((wcslen(installDir) + 1) * sizeof(wchar_t)));
        RegSetValueExW(hk, L"NoModify", 0, REG_DWORD, (const BYTE*)&one, sizeof(one));
        RegSetValueExW(hk, L"NoRepair", 0, REG_DWORD, (const BYTE*)&one, sizeof(one));
        RegCloseKey(hk);
    }

    wchar_t indexPath[MAX_PATH];
    path_join(indexPath, MAX_PATH, gameDir, L"index.html");
    launch_game(indexPath);

    wchar_t done[MAX_PATH * 2];
    StringCchPrintfW(done, MAX_PATH * 2,
        L"\u0646\u0635\u0628 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0646\u062C\u0627\u0645 \u0634\u062F!\n\n"
        L"\u0645\u06CC\u0627\u0646\u200C\u0628\u0631 \u00AB\u062C\u0646\u06AF \u0633\u0644\u0633\u0644\u0647\u00BB \u062F\u0631 \u062F\u0633\u06A9\u062A\u0627\u067E \u0633\u0627\u062E\u062A\u0647 \u0634\u062F.\n"
        L"\u0645\u0633\u06CC\u0631 \u0646\u0635\u0628: %s",
        installDir);
    msg(done, MB_ICONINFORMATION);
}

static int try_launch_installed(void) {
    wchar_t localAppData[MAX_PATH], indexPath[MAX_PATH];
    get_known_folder(&FOLDERID_LocalAppData, localAppData, MAX_PATH);
    StringCchPrintfW(indexPath, MAX_PATH, L"%s\\%s\\%s\\index.html", localAppData, APP_DIR_W, GAME_SUBDIR);
    if (GetFileAttributesW(indexPath) != INVALID_FILE_ATTRIBUTES) {
        launch_game(indexPath);
        return 1;
    }
    return 0;
}

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE hPrev, LPSTR lpCmdLine, int nCmdShow) {
    (void)hInst; (void)hPrev; (void)lpCmdLine; (void)nCmdShow;
    CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);

    wchar_t *cmdW = GetCommandLineW();
    if (cmdW && wcsstr(cmdW, L"--uninstall")) {
        do_uninstall();
        CoUninitialize();
        return 0;
    }

    if (try_launch_installed()) {
        CoUninitialize();
        return 0;
    }

    wchar_t self[MAX_PATH];
    GetModuleFileNameW(NULL, self, MAX_PATH);
    do_install(self);
    CoUninitialize();
    return 0;
}
