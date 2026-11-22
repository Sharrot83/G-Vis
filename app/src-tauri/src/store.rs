//! Microsoft Store: vilka tillägg som är köpta, och köp av ett tillägg. Bara i Windows.
use windows::core::{Interface, HSTRING};
use windows::Services::Store::{StoreContext, StorePurchaseStatus};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::Shell::IInitializeWithWindow;

/// Tilläggen som är köpta och aktiva, med sina produkt-id (InAppOfferToken), till exempel "larare".
pub fn owned() -> windows::core::Result<Vec<String>> {
    let ctx = StoreContext::GetDefault()?;
    let lic = ctx.GetAppLicenseAsync()?.get()?;
    let mut out = Vec::new();
    let it = lic.AddOnLicenses()?.First()?;
    while it.HasCurrent()? {
        let l = it.Current()?.Value()?;
        if l.IsActive()? {
            out.push(l.InAppOfferToken()?.to_string());
        }
        it.MoveNext()?;
    }
    Ok(out)
}

/// Köper tillägget med Store-id:t (till exempel 9N…). Store visar sitt eget köpfönster över G-vis.
pub fn buy(hwnd: isize, store_id: &str) -> windows::core::Result<String> {
    let ctx = StoreContext::GetDefault()?;
    let init: IInitializeWithWindow = ctx.cast()?;
    unsafe { init.Initialize(HWND(hwnd as *mut core::ffi::c_void))? };
    let r = ctx.RequestPurchaseAsync(&HSTRING::from(store_id))?.get()?;
    let s = r.Status()?;
    Ok(match s {
        StorePurchaseStatus::Succeeded => "ok",
        StorePurchaseStatus::AlreadyPurchased => "redan",
        StorePurchaseStatus::NotPurchased => "avbrutet",
        StorePurchaseStatus::NetworkError => "natverk",
        _ => "fel",
    }
    .to_string())
}
